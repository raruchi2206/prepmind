import asyncio
import sys
import time
from services.rag_service import rag_service

SAMPLE_CHUNKS = [
    {
        "knowledgeSourceId": "src1",
        "chunkId": "c1",
        "chunkIndex": 0,
        "text": """Computer Vision and OpenCV Fundamentals:
OpenCV (Open Source Computer Vision Library) is an open-source computer vision and machine learning software library.
In OpenCV, images are loaded using cv2.imread(), which reads image files in BGR (Blue, Green, Red) format by default rather than standard RGB format.
To convert an image between color spaces, such as converting from BGR to grayscale or RGB, the function cv2.cvtColor() is utilized with color conversion codes like cv2.COLOR_BGR2GRAY.
Image resizing is accomplished using cv2.resize(), which accepts interpolation methods such as INTER_LINEAR, INTER_NEAREST, and INTER_CUBIC.
Thresholding is a technique used to segment images into binary foreground and background regions. Simple thresholding is implemented via cv2.threshold(), where pixel values are compared against a fixed threshold value T.
Adaptive thresholding, computed using cv2.adaptiveThreshold(), calculates different thresholds for different regions of an image based on local neighborhood statistics such as the mean or Gaussian weighted sum.
Edge detection is commonly performed using the Canny edge detector algorithm via cv2.Canny(), which involves Gaussian smoothing, gradient calculation, non-maximum suppression, and hysteresis thresholding.
Morphological transformations include erosion using cv2.erode() to remove noise and diminish boundary pixels, and dilation using cv2.dilate() to expand boundaries and fill small holes.""",
        "metadata": {"originalFileName": "opencv_guide.pdf", "page": 1}
    },
    {
        "knowledgeSourceId": "src1",
        "chunkId": "c2",
        "chunkIndex": 1,
        "text": """Image Filtering and Smoothing in OpenCV:
Blurring techniques reduce high-frequency noise in images. Gaussian blur using cv2.GaussianBlur() convolves the image with a Gaussian kernel.
Median filtering using cv2.medianBlur() replaces each pixel with the median of neighboring pixels, making it highly effective at removing salt-and-pepper noise.
Bilateral filtering using cv2.bilateralFilter() smooths images while preserving sharp edges by considering both spatial distance and radiometric intensity differences.
Contours represent curves joining all continuous points along a boundary having the same color or intensity. Contours are detected using cv2.findContours() and drawn with cv2.drawContours().
Image histograms represent the frequency distribution of pixel intensities across an image and are calculated using cv2.calcHist().
Histogram equalization via cv2.equalizeHist() improves image contrast by stretching intensity distributions across the full dynamic range.
Feature extraction algorithms in OpenCV include SIFT (Scale-Invariant Feature Transform) and ORB (Oriented FAST and Rotated BRIEF), which identify keypoints and compute feature descriptors for object recognition and tracking.""",
        "metadata": {"originalFileName": "opencv_guide.pdf", "page": 2}
    }
]

async def test_quiz_counts():
    results = {}
    for count in [3, 5, 8, 10]:
        print(f"\n==========================================")
        print(f"TESTING QUIZ GENERATION: {count} QUESTIONS")
        print(f"==========================================")
        t0 = time.time()
        try:
            result = await rag_service.generate_quiz(
                chunks=SAMPLE_CHUNKS,
                title="OpenCV Assessment",
                question_count=count,
                difficulty="Medium",
                question_type="MCQ",
                generation_id=f"test-{count}"
            )
            elapsed = time.time() - t0
            questions = result.get("questions", [])
            print(f"Result question count: {len(questions)} (Expected: {count})")
            print(f"Elapsed time: {elapsed:.2f}s")
            
            assert len(questions) == count, f"Count mismatch! Expected {count}, got {len(questions)}"
            
            for i, q in enumerate(questions, 1):
                print(f"  Q{i}: {q.get('question')} | Ans: {q.get('correctAnswer')}")
                assert q.get("question"), f"Q{i} has empty question text"
                assert len(q.get("options", [])) == 4, f"Q{i} does not have exactly 4 options"
                assert q.get("correctAnswer") in q.get("options"), f"Q{i} correctAnswer not in options"
                assert q.get("explanation"), f"Q{i} missing explanation"
            
            print(f"TEST {count} QUESTIONS: PASS [OK]")
            results[count] = "PASS"
        except Exception as e:
            print(f"TEST {count} QUESTIONS: FAIL [ERROR] | Reason: {e}")
            results[count] = f"FAIL ({e})"
    
    print("\n==========================================")
    print("FINAL SUMMARY OF QUIZ COUNT TESTS:")
    for count, status in results.items():
        print(f"  Quiz {count} -> {status}")
    print("==========================================")

if __name__ == "__main__":
    asyncio.run(test_quiz_counts())
