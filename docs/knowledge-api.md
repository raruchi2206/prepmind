# PrepMind Knowledge Management API (Stage 2)

All Knowledge Management endpoints are mounted at `/api/knowledge` and require an authenticated session via the HttpOnly access token cookie.

---

## 1. Create Knowledge Source

Creates a new knowledge source record (e.g. YouTube link or manual source).

- **Method**: `POST`
- **URL**: `/api/knowledge`
- **Authentication**: Required (`requireAuth`)
- **Headers**: `Content-Type: application/json`

### Request Body
```json
{
  "title": "Operating Systems Notes",
  "type": "PDF",
  "youtubeUrl": "https://www.youtube.com/watch?v=example"
}
```

- `title` (string, required): 1 to 200 characters.
- `type` (string, required): `PDF` | `PPTX` | `DOCX` | `TXT` | `YOUTUBE`
- `youtubeUrl` (string, required if `type === "YOUTUBE"`): Valid URL.

### Response `201 Created`
```json
{
  "success": true,
  "message": "Knowledge source created successfully",
  "data": {
    "knowledgeSource": {
      "id": "60c72b2f9b1d8b0015f89991",
      "userId": "60c72b2f9b1d8b0015f89990",
      "title": "Operating Systems Notes",
      "type": "PDF",
      "originalFileName": null,
      "youtubeUrl": null,
      "status": "UPLOADING",
      "errorMessage": null,
      "metadata": {
        "pageCount": 0,
        "wordCount": 0,
        "chunkCount": 0
      },
      "createdAt": "2026-09-30T15:30:00.000Z",
      "updatedAt": "2026-09-30T15:30:00.000Z"
    }
  }
}
```

---

## 2. Upload Document File

Uploads a document file (PDF, PPTX, DOCX, TXT) and stores it in a user-isolated server directory (`backend/storage/uploads/{userId}/`).

- **Method**: `POST`
- **URL**: `/api/knowledge/upload`
- **Authentication**: Required (`requireAuth`)
- **Headers**: `Content-Type: multipart/form-data`

### Form Data
- `file` (file, required): Document file (max 25MB).
- `title` (string, optional): Custom title (defaults to file name).

### Response `201 Created`
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "knowledgeSource": {
      "id": "60c72b2f9b1d8b0015f89992",
      "userId": "60c72b2f9b1d8b0015f89990",
      "title": "DBMS Lecture 1",
      "type": "PDF",
      "originalFileName": "lecture1.pdf",
      "status": "UPLOADING",
      "metadata": {
        "pageCount": 0,
        "wordCount": 0,
        "chunkCount": 0
      },
      "createdAt": "2026-09-30T15:30:00.000Z",
      "updatedAt": "2026-09-30T15:30:00.000Z"
    }
  }
}
```

---

## 3. Get All Knowledge Sources

Retrieves all knowledge sources owned by the authenticated user, sorted newest first (`createdAt: -1`).

- **Method**: `GET`
- **URL**: `/api/knowledge`
- **Authentication**: Required (`requireAuth`)

### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "knowledgeSources": [
      {
        "id": "60c72b2f9b1d8b0015f89992",
        "userId": "60c72b2f9b1d8b0015f89990",
        "title": "DBMS Lecture 1",
        "type": "PDF",
        "originalFileName": "lecture1.pdf",
        "status": "UPLOADING",
        "metadata": {
          "pageCount": 0,
          "wordCount": 0,
          "chunkCount": 0
        },
        "createdAt": "2026-09-30T15:30:00.000Z",
        "updatedAt": "2026-09-30T15:30:00.000Z"
      }
    ]
  }
}
```

---

## 4. Get Single Knowledge Source

Retrieves a single knowledge source by ID, strictly enforcing user ownership.

- **Method**: `GET`
- **URL**: `/api/knowledge/:id`
- **Authentication**: Required (`requireAuth`)

### Response `200 OK`
```json
{
  "success": true,
  "data": {
    "knowledgeSource": {
      "id": "60c72b2f9b1d8b0015f89992",
      "userId": "60c72b2f9b1d8b0015f89990",
      "title": "DBMS Lecture 1",
      "type": "PDF",
      "status": "UPLOADING",
      "metadata": {
        "pageCount": 0,
        "wordCount": 0,
        "chunkCount": 0
      },
      "createdAt": "2026-09-30T15:30:00.000Z",
      "updatedAt": "2026-09-30T15:30:00.000Z"
    }
  }
}
```

### Error `404 Not Found`
If the resource ID does not exist or belongs to another user:
```json
{
  "success": false,
  "message": "Knowledge source not found"
}
```

---

## 5. Update Knowledge Source

Updates editable properties (e.g. `title`) of an existing knowledge source owned by the authenticated user.

- **Method**: `PATCH`
- **URL**: `/api/knowledge/:id`
- **Authentication**: Required (`requireAuth`)
- **Headers**: `Content-Type: application/json`

### Request Body
```json
{
  "title": "Updated DBMS Notes (Final Revision)"
}
```

### Response `200 OK`
```json
{
  "success": true,
  "message": "Knowledge source updated successfully",
  "data": {
    "knowledgeSource": {
      "id": "60c72b2f9b1d8b0015f89992",
      "title": "Updated DBMS Notes (Final Revision)"
    }
  }
}
```

---

## 6. Delete Knowledge Source

Deletes a knowledge source record and cleans up any associated file from storage.

- **Method**: `DELETE`
- **URL**: `/api/knowledge/:id`
- **Authentication**: Required (`requireAuth`)

### Response `200 OK`
```json
{
  "success": true,
  "message": "Knowledge source deleted successfully"
}
```

---

## Security & Access Control Summary
1. **Zero Trust Client Identity**: `userId` is strictly derived from verified JWT cookie (`req.user._id`), never from request bodies or parameters.
2. **Strict Ownership Scoping**: Every database lookup queries both `{ _id: id, userId: req.user._id }`.
3. **No Information Leakage**: Requests for another user's knowledge source return a generic `404 Not Found` without disclosing the resource's existence.
4. **Isolated File Storage**: Uploads are saved into per-user directories (`backend/storage/uploads/{userId}/`) with non-guessable random hex filenames to prevent path traversal and collision.
