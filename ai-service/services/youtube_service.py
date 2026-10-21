import asyncio
import html
import logging
import re
from typing import Any, Dict, List, Optional

import httpx
from youtube_transcript_api import (
    AgeRestricted,
    InvalidVideoId,
    IpBlocked,
    NoTranscriptFound,
    PoTokenRequired,
    RequestBlocked,
    TranscriptsDisabled,
    VideoUnavailable,
    VideoUnplayable,
    YouTubeRequestFailed,
    YouTubeTranscriptApi,
    YouTubeTranscriptApiException,
)
from youtube_transcript_api.proxies import GenericProxyConfig, WebshareProxyConfig

from config.settings import settings

logger = logging.getLogger("youtube_service")

VIDEO_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{11}$")
# Non-speech caption annotations such as [Music], [Applause], (laughter)
NON_SPEECH_PATTERN = re.compile(
    r"[\[(](?:music|applause|laughter|laughs|silence|inaudible|cheering|noise|foreign)[\])]",
    re.IGNORECASE,
)


class TranscriptError(Exception):
    def __init__(self, code: str, message: str, http_status: int = 422):
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status


def _build_proxy_config():
    if settings.YOUTUBE_WEBSHARE_PROXY_USERNAME and settings.YOUTUBE_WEBSHARE_PROXY_PASSWORD:
        return WebshareProxyConfig(
            proxy_username=settings.YOUTUBE_WEBSHARE_PROXY_USERNAME,
            proxy_password=settings.YOUTUBE_WEBSHARE_PROXY_PASSWORD,
        )
    if settings.YOUTUBE_PROXY_HTTP_URL or settings.YOUTUBE_PROXY_HTTPS_URL:
        return GenericProxyConfig(
            http_url=settings.YOUTUBE_PROXY_HTTP_URL or None,
            https_url=settings.YOUTUBE_PROXY_HTTPS_URL or None,
        )
    return None


def clean_snippet_text(text: str) -> str:
    text = html.unescape(text or "")
    text = NON_SPEECH_PATTERN.sub(" ", text)
    text = text.replace("\n", " ")
    return re.sub(r"\s+", " ", text).strip()


def _select_transcript(transcript_list, languages: List[str]):
    """Prefer requested languages (manual before generated), else the first available transcript."""
    if languages:
        try:
            return transcript_list.find_transcript(languages)
        except NoTranscriptFound:
            pass

    available = list(transcript_list)
    if not available:
        return None
    manual = [t for t in available if not t.is_generated]
    return (manual or available)[0]


def _fetch_transcript_sync(video_id: str, languages: List[str]) -> Dict[str, Any]:
    api = YouTubeTranscriptApi(proxy_config=_build_proxy_config())
    transcript_list = api.list(video_id)
    transcript = _select_transcript(transcript_list, languages)
    if transcript is None:
        raise TranscriptError("TRANSCRIPT_UNAVAILABLE", "No transcript is available for this video.")

    fetched = transcript.fetch()
    segments = []
    for snippet in fetched.snippets:
        text = clean_snippet_text(snippet.text)
        if not text:
            continue
        segments.append({
            "text": text,
            "start": round(float(snippet.start), 2),
            "duration": round(float(snippet.duration), 2),
        })

    return {
        "language": transcript.language,
        "languageCode": transcript.language_code,
        "isGenerated": bool(transcript.is_generated),
        "segments": segments,
    }


async def fetch_video_metadata(video_id: str) -> Dict[str, Optional[str]]:
    """Public oEmbed lookup for title/channel. Non-fatal: returns None values when unavailable."""
    url = "https://www.youtube.com/oembed"
    params = {"url": f"https://www.youtube.com/watch?v={video_id}", "format": "json"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, params=params)
        if res.status_code == 200:
            data = res.json()
            return {"title": data.get("title"), "channel": data.get("author_name")}
    except Exception as e:
        logger.warning(f"[YOUTUBE] oEmbed metadata lookup failed for {video_id}: {e}")
    return {"title": None, "channel": None}


async def fetch_transcript(video_id: str, languages: Optional[List[str]] = None) -> Dict[str, Any]:
    if not video_id or not VIDEO_ID_PATTERN.match(video_id):
        raise TranscriptError("INVALID_VIDEO_ID", "Invalid YouTube video ID.", 400)

    preferred = [lang for lang in (languages or []) if lang] or ["en"]
    logger.info(f"[YOUTUBE] Transcript fetch started | video={video_id} | languages={preferred}")

    try:
        transcript_task = asyncio.wait_for(
            asyncio.to_thread(_fetch_transcript_sync, video_id, preferred),
            timeout=settings.YOUTUBE_TRANSCRIPT_TIMEOUT_SECONDS,
        )
        result, metadata = await asyncio.gather(transcript_task, fetch_video_metadata(video_id))
    except TranscriptError:
        raise
    except asyncio.TimeoutError:
        raise TranscriptError("TRANSCRIPT_PROVIDER_UNAVAILABLE", "Transcript provider timed out. Please try again.", 504)
    except TranscriptsDisabled:
        raise TranscriptError("TRANSCRIPT_UNAVAILABLE", "Captions are disabled for this video, so no transcript is available.")
    except NoTranscriptFound:
        raise TranscriptError("TRANSCRIPT_UNAVAILABLE", "No transcript was found for this video.")
    except InvalidVideoId:
        raise TranscriptError("INVALID_VIDEO_ID", "Invalid YouTube video ID.", 400)
    except (VideoUnavailable, VideoUnplayable):
        raise TranscriptError("VIDEO_UNAVAILABLE", "This video is unavailable, private, or cannot be played.", 404)
    except AgeRestricted:
        raise TranscriptError("TRANSCRIPT_UNAVAILABLE", "This video is age-restricted; its transcript cannot be accessed without sign-in.")
    except (RequestBlocked, IpBlocked):
        raise TranscriptError(
            "TRANSCRIPT_PROVIDER_UNAVAILABLE",
            "YouTube is blocking transcript requests from this server. Configure a proxy (see ai-service/.env.example) or try again later.",
            503,
        )
    except (PoTokenRequired, YouTubeRequestFailed) as e:
        raise TranscriptError("TRANSCRIPT_PROVIDER_UNAVAILABLE", f"Transcript provider request failed: {type(e).__name__}.", 503)
    except YouTubeTranscriptApiException as e:
        raise TranscriptError("TRANSCRIPT_UNAVAILABLE", f"Transcript could not be retrieved: {type(e).__name__}.")
    except Exception as e:
        logger.error(f"[YOUTUBE] Unexpected transcript failure for {video_id}: {e}")
        raise TranscriptError("TRANSCRIPT_PROVIDER_UNAVAILABLE", "Transcript provider is unavailable. Please try again later.", 503)

    segments = result["segments"]
    word_count = sum(len(s["text"].split()) for s in segments)
    if not segments or word_count == 0:
        raise TranscriptError("EMPTY_TRANSCRIPT", "The transcript for this video is empty.")
    if word_count > settings.YOUTUBE_MAX_TRANSCRIPT_WORDS:
        raise TranscriptError(
            "TRANSCRIPT_TOO_LARGE",
            f"Transcript has {word_count} words, exceeding the limit of {settings.YOUTUBE_MAX_TRANSCRIPT_WORDS}.",
            413,
        )

    last = segments[-1]
    logger.info(
        f"[YOUTUBE] Transcript fetch completed | video={video_id} | lang={result['languageCode']} "
        f"| generated={result['isGenerated']} | segments={len(segments)} | words={word_count}"
    )
    return {
        "videoId": video_id,
        "title": metadata.get("title"),
        "channel": metadata.get("channel"),
        "language": result["language"],
        "languageCode": result["languageCode"],
        "isGenerated": result["isGenerated"],
        "durationSeconds": round(last["start"] + last["duration"], 2),
        "wordCount": word_count,
        "segments": segments,
    }
