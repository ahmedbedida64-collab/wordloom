# RECONNAISSANCE REPORT (Phase 0)

## 1. Data Location & Architecture
- **Books Data:** Stored directly inside `index.html` within the `const WORDLOOM_CATALOG` JavaScript array.
- **Logic Mix:** The data is embedded in the same file as HTML and application logic. Updates will require careful string/AST manipulation of `index.html` to replace the array without touching surrounding code.
- **Covers:** Currently referenced via the `photo` field as external URLs (e.g., `imgix.net`). The UI also uses a CSS class in the `cover` field (e.g., `cover-rose`) as a fallback or decorative theme. 
- **New Covers Location:** Will need to establish a local directory (e.g., `./covers/`) to store the AI-generated images.

## 2. Frozen Book Record Schema
```json
{
  "title": "String",
  "author": "String",
  "level": "String",
  "topic": "String",
  "cover": "String (CSS theme class)",
  "progress": "Number",
  "source": "String",
  "length": "String",
  "kind": "String",
  "description": "String",
  "photo": "String (URL/Path)",
  "chapters": [
    {
      "title": "String",
      "subtitle": "String",
      "paragraphs": ["String"]
    }
  ]
}
```

## 3. Taxonomy & Targets
- **Levels:** `A1`, `A2`, `B1`, `B2`, `C1` (Note: The existing catalog includes `C2` entries, but the UI filter only supports up to `C1`. We will use the existing counts as the target distribution).
- **Topics:** `life`, `travel`, `science`, `history`, `culture`, `technology`, `business`.

## 4. Page Definition & Word Count Logic
- **App Definition:** The app reader paginates by reading the `chapters` array. **1 item in `chapters` = 1 reader page.**
- **Conflict:** The prompt requires books to be "20 to 100 pages". Since the app doesn't split by words dynamically, meeting a 20-100 "page" requirement means creating 20-100 items in the `chapters` array per book. Because `words_per_page_override` is null, I cannot calculate an absolute word count limit yet.
- **Open Question for Gate 1:** I need the user to define `words_per_page_override` or clarify if I should artificially chunk texts into 20-100 `chapters`.

## 5. Tests / Build Steps
- The application is a vanilla single-file structure (`index.html`). No build steps (`npm run build`) are present. Execution is verified via standard browser loading.

