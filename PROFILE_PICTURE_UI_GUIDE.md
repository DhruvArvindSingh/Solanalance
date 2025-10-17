# Profile Picture Upload - UI/UX Guide

## Page Layout: `/profile/edit`

### Profile Picture Section

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎨 Profile Picture                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  Upload Profile Picture                           │
│  │    👤    │  ┌──────────────────────────────────────┐         │
│  │   J.D    │  │ Choose File   [No file chosen] ▼    │ [Upload]│
│  └──────────┘  └──────────────────────────────────────┘ [   x  ]│
│  (Avatar)      Max 5 MB. Supported: JPEG, PNG, GIF, WebP        │
│                                                                  │
│                ────────── Or ──────────                          │
│                                                                  │
│                Avatar URL                                        │
│                ┌──────────────────────────────────────┐         │
│                │ https://example.com/avatar.jpg      │         │
│                └──────────────────────────────────────┘         │
│                Or provide a URL to your profile picture          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## File Upload States

### State 1: Initial State (No File Selected)
```
┌──────────────────────────────────────────────────┐
│ Upload Profile Picture                           │
│ ┌──────────────────────────────────────────────┐ │
│ │ Choose File   [No file chosen]         ▼    │ │
│ └──────────────────────────────────────────────┘ │
│ Max 5 MB. Supported: JPEG, PNG, GIF, WebP        │
└──────────────────────────────────────────────────┘

✓ No buttons visible
✓ Helper text shows file requirements
✓ Can enter URL instead
```

### State 2: File Selected (With Preview)
```
┌──────────────────────────────────────────────────────────────┐
│ Upload Profile Picture                                        │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Choose File  [profile.jpg]                        ▼     │ │
│ └──────────────────────────────────────────────────────────┘ │
│ Selected: profile.jpg (1.23 MB)                               │
│ ┌──────────────┐ ┌──────────┐ ┌─────────────┐              │
│ │  📤 Upload   │ │    ×     │ │  Cancel URL │ (optional)  │
│ └──────────────┘ └──────────┘ └─────────────┘              │
│                                                               │
│ Avatar preview updates in real-time                          │
└──────────────────────────────────────────────────────────────┘

✓ Upload button visible
✓ Remove button visible
✓ Shows selected filename
✓ Shows file size
✓ Avatar shows preview
```

### State 3: Uploading
```
┌──────────────────────────────────────────────────────────────┐
│ Upload Profile Picture                                        │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Choose File  [profile.jpg]                        ▼     │ │
│ └──────────────────────────────────────────────────────────┘ │
│ Selected: profile.jpg (1.23 MB)                               │
│ ┌──────────────────────────────────┐ ┌─────────────┐        │
│ │ ⟳ Uploading...                  │ │      ×      │        │
│ └──────────────────────────────────┘ └─────────────┘        │
│ [████████████░░░░░░░░░░░░░░░░░░░░] 45%                      │
│                                                               │
│ Avatar shows uploading spinner                              │
└──────────────────────────────────────────────────────────────┘

✓ Upload button disabled
✓ Loading animation
✓ Progress indicator
✓ Can still cancel
```

### State 4: Upload Complete
```
┌──────────────────────────────────────────────────────────────┐
│ Upload Profile Picture                                        │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Choose File  [profile.jpg]                        ▼     │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ✓ Profile picture uploaded successfully!                     │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │  Choose File   [No file chosen]                     ▼   │ │
│ └──────────────────────────────────────────────────────────┘ │
│ Max 5 MB. Supported: JPEG, PNG, GIF, WebP                   │
│                                                               │
│ Avatar displays uploaded image from S3                       │
└──────────────────────────────────────────────────────────────┘

✓ Success toast notification
✓ File input cleared
✓ Avatar updated with S3 image
✓ Can upload another file
```

### State 5: Error Handling
```
FILE SIZE ERROR:
┌──────────────────────────────────────────────────────────────┐
│ ✗ File size must be less than 5 MB                           │
└──────────────────────────────────────────────────────────────┘
(Toast notification at bottom)

FILE TYPE ERROR:
┌──────────────────────────────────────────────────────────────┐
│ ✗ Only JPEG, PNG, GIF, and WebP images are allowed           │
└──────────────────────────────────────────────────────────────┘
(Toast notification at bottom)

UPLOAD ERROR:
┌──────────────────────────────────────────────────────────────┐
│ ✗ Failed to upload profile picture                           │
└──────────────────────────────────────────────────────────────┘
(Toast notification at bottom)
```

## Avatar Display

### In Edit Profile Page
```
┌──────────────────────────────────────┐
│ Avatar with Border                   │
│ ┌────────────────────────────────┐   │
│ │                                │   │
│ │        ┌──────────┐            │   │
│ │        │    👤    │            │   │
│ │        │   (S3)   │            │   │
│ │        │   or     │            │   │
│ │        │   [J.D]  │            │   │
│ │        │  fallback│            │   │
│ │        └──────────┘            │   │
│ │    (displays preview if         │   │
│ │     file selected)              │   │
│ │                                │   │
│ └────────────────────────────────┘   │
│ 96x96px, border-4 border-white/10    │
└──────────────────────────────────────┘

✓ Large preview
✓ Real-time update during upload
✓ S3 URL after upload completes
✓ Gradient fallback if no image
```

### In Profile Page
```
┌─────────────────────────────────────────┐
│                                         │
│     ┌──────────────┐                    │
│     │              │                    │
│     │  ┌────────┐  │                    │
│     │  │   👤   │  │  John Doe          │
│     │  │  (S3)  │  │  Web Developer     │
│     │  │   or   │  │                    │
│     │  │[Fallb.]│  │  ⭐ 4.8 (12 ratings)│
│     │  └────────┘  │                    │
│     │              │                    │
│     └──────────────┘                    │
│  64x64px on profile card                │
│                                         │
└─────────────────────────────────────────┘
```

### In Navbar/Header
```
┌────────────────────────────────────────┐
│ Logo    Nav Items    ┌────────┐  Menu  │
│                      │ Avatar │        │
│                      │ (S3)   │        │
│                      │  or    │        │
│                      │[Fall.]│        │
│                      └────────┘        │
│                     32x32px            │
│                                        │
└────────────────────────────────────────┘
```

## File Input Behavior

### Desktop
```
┌──────────────────────────────────────────────────┐
│ Choose File  [profile.jpg]                    ▼  │
└──────────────────────────────────────────────────┘
                                              ↓
Click anywhere on the row opens file browser:

┌─────────────────────────────────┐
│ Open File                       │
├─────────────────────────────────┤
│                                 │
│  📁 Pictures                    │
│     ✓ profile.jpg  (1.23 MB)   │
│     profile_old.png (2.45 MB)   │
│     vacation.jpg   (3.12 MB)    │
│                                 │
├─────────────────────────────────┤
│ [Cancel]          [Open]        │
└─────────────────────────────────┘

✓ Multiple files visible
✓ File sizes shown
✓ Can select any file
✓ Cancel option available
```

### Mobile
```
┌────────────────────────────────┐
│ Choose File  [No file]  ▼ [Camera]│
└────────────────────────────────┘
                              ↓
┌─────────────────────────────────┐
│ Upload Options                  │
├─────────────────────────────────┤
│                                 │
│  📱 Take Photo                  │
│  📂 Choose from Gallery         │
│  ✋ Cancel                       │
│                                 │
└─────────────────────────────────┘

✓ Mobile-friendly options
✓ Camera option available
✓ Gallery access
```

## Validation Messages

### Real-time Validation
```
File Selected: profile.jpg (2.5 MB)
✓ Valid JPEG
✓ Within 5 MB limit
→ Ready to upload

File Selected: photo.bmp (6.0 MB)
✗ BMP format not supported
✗ File exceeds 5 MB limit
→ Cannot upload

File Selected: huge_photo.jpg (15 MB)
✗ File size must be less than 5 MB
  Current: 15 MB
→ Choose smaller file
```

## Color Scheme

```
✅ Success
   - Green (#22c55e)
   - Check mark icon
   - "Profile picture uploaded successfully!"

⚠️ Warning
   - Amber (#f59e0b)
   - Alert circle icon
   - "File size must be less than 5 MB"

❌ Error
   - Red (#ef4444)
   - X mark icon
   - "Failed to upload profile picture"

ℹ️ Info
   - Blue (#3b82f6)
   - Info icon
   - "Max 5 MB. Supported: JPEG, PNG, GIF, WebP"
```

## Loading States

### Upload Progress
```
Uploading...   [████████░░░░░░░░░░░░░] 40%

Uploading...   [██████████████░░░░░░░░░] 60%

Uploading...   [████████████████████░░░] 90%

✓ Complete!    [████████████████████████] 100%
```

### Avatar Loading
```
┌────────────┐
│     ⟳      │  (Spinner while loading S3 image)
│  Loading   │
└────────────┘
       ↓
┌────────────┐
│     👤     │  (Shows once loaded)
│   (Image)  │
└────────────┘
```

## Accessibility

### Keyboard Navigation
```
Tab → File Input
Space/Enter → Open file dialog
Tab → Upload Button
Enter → Start upload
Tab → Remove Button
Enter → Clear selection
Tab → URL Input
```

### Screen Reader
```
"Upload Profile Picture"
"File input: No file selected. 
 Maximum size 5 MB. 
 Supported formats: JPEG, PNG, GIF, WebP"

"Selected: profile.jpg (1.23 MB)"

"Upload button. Start file upload."
"Remove button. Clear file selection."

"Profile picture uploaded successfully!"
```

### Error Announcements
```
"File size must be less than 5 MB. 
 Current size: 6.5 MB."

"File type error. Only JPEG, PNG, GIF, and 
 WebP images are allowed."
```

## Responsive Behavior

### Desktop (> 768px)
```
┌────────────────────────────────────────────┐
│ ┌────────┐  Upload Picture   File Upload   │
│ │ Avatar │  ─────────────────────────────  │
│ │ 96x96  │  [Choose File]  [Upload] [×]   │
│ └────────┘  Max 5 MB info...               │
│             ─ Or ─                         │
│             [Avatar URL input]             │
└────────────────────────────────────────────┘
```

### Tablet (< 768px)
```
┌──────────────────────────────────┐
│ ┌──────┐  Upload Picture         │
│ │Avatar│  [Choose File] [Upload] │
│ │ 80x80│  Max 5 MB...            │
│ └──────┘                          │
│        ─ Or ─                     │
│        [Avatar URL input]         │
└──────────────────────────────────┘
```

### Mobile (< 480px)
```
┌────────────────────┐
│ Upload Picture     │
│ ┌──────┐           │
│ │Avatar│           │
│ │ 64x64│           │
│ └──────┘           │
│ [Choose File]      │
│ [Upload] [×]       │
│ Max 5 MB...        │
│ ─ Or ─             │
│ [Avatar URL]       │
└────────────────────┘
```

## Interaction Timeline

### Scenario: User uploads profile picture

**1. Page Load (0s)**
```
✓ Avatar shows with default fallback (J.D)
✓ File input ready
✓ No file selected
```

**2. User selects file (1s)**
```
✓ File dialog opens
✓ User selects profile.jpg (1.2 MB)
```

**3. File selected (2s)**
```
✓ Avatar preview updates
✓ Shows "Selected: profile.jpg (1.2 MB)"
✓ Upload button appears
✓ Remove button appears
```

**4. User clicks Upload (3s)**
```
✓ Upload button shows "Uploading..."
✓ Spinner animation
✓ Progress bar (0% → 100%)
✓ Network request to /api/profile/picture/upload
```

**5. Upload completes (4-5s)**
```
✓ Success toast: "Profile picture uploaded successfully!"
✓ Avatar displays S3 image
✓ File input clears ("No file chosen")
✓ Upload/Remove buttons hide
```

**6. Page refresh (any time)**
```
✓ Avatar shows S3 image
✓ Retrieved from database
✓ No re-upload needed
```

**7. Logout/Login (later)**
```
✓ On login: Profile picture fetched from S3
✓ Displays immediately on profile pages
✓ Shows in navbar/header
```

---

**Status: ✅ UI/UX Design Complete**
**Date: October 17, 2025**
