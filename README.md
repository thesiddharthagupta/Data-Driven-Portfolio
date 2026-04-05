# Dynamic Data-Driven Portfolio 🚀

A highly customizable, responsive, and modern personal portfolio designed specifically for Computer Science students and developers. 

**Live Demo:** [https://thesiddharthagupta.github.io/Data-Driven-Portfolio/](https://thesiddharthagupta.github.io/Data-Driven-Portfolio/)

## ✨ Features

- **Built-in Admin Dashboard:** A secure, password-protected backend (`/admin.html`) that allows you to update your portfolio's content on the fly without touching any code.
- **Dynamic Data Rendering:** Everything from your name, "About Me" bio, skills, education, and projects is loaded dynamically from a centralized data layer (`data.js`).
- **Premium UI/UX:** Features a modern dark mode, sleek glassmorphism cards, glowing timeline elements, and satisfying micro-animations.
- **Image Cropper Tool:** Built-in photo upload functionality with an integrated image cropper to ensure perfect, high-quality, circular profile pictures.
- **Emoji Fallback:** Don't have a photo? The portfolio elegantly falls back to a customizable emoji (e.g., 👨‍💻).
- **Fully Responsive:** Looks and functions perfectly on desktops, tablets, and mobile devices.
- **100% Client-Side:** No database required. Data is securely managed and persisted locally via the browser's `localStorage` and can be easily exported/imported as JSON backups.

## 🛠️ Technologies Used

- **HTML5** for semantic structure
- **CSS3 (Vanilla)** for premium styling, CSS grid/flexbox, animations, and glassmorphism themes
- **JavaScript (ES6+)** for dynamic data injection, state management, and the typing animation
- **Cropper.js** for handling frontend image cropping in the admin panel

## 🚀 Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/thesiddharthagupta/Data-Driven-Portfolio.git
   ```
2. Navigate to the project directory:
   ```bash
   cd Data-Driven-Portfolio
   ```
3. Open `index.html` in your web browser. (Alternatively, use a local server like VS Code's "Live Server" extension for the best experience).

## ⚙️ Administration & Configuration

To edit the portfolio content:

1. Open `admin.html` in your browser (or click the subtle ⚙️ gear icon in the portfolio's top navigation bar).
2. Enter the default administrator password: **`admin123`** (You can change this inside the security settings later).
3. Use the dashboard to update your hero text, upload a new photo, add GitHub projects, or tweak your resume timeline.
4. Click **Save**. Your changes will immediately reflect on the main `index.html` page.

### Data Backup
Since data is saved locally, it is highly recommended to use the **"Data Management"** tab in the admin panel to export your configuration as a `.json` file whenever you make significant updates.

---
*Designed & developed by [Siddharth Gupta](https://github.com/thesiddharthagupta).*
