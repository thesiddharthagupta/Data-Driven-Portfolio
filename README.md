# Dynamic Data-Driven Portfolio 🚀

A highly customizable, responsive, and modern personal portfolio designed specifically for Computer Science students and developers. 

**Live Demo:** [https://thesiddharthagupta.github.io/Data-Driven-Portfolio/](https://thesiddharthagupta.github.io/Data-Driven-Portfolio/)

## ✨ Features

- **Supabase Backend Integration:** Fully powered by Supabase for Database, Authentication, and Storage. No more `localStorage` limits!
- **Built-in Admin Dashboard:** A secure, authenticated backend (`/admin.html`) that allows you to update your portfolio's content on the fly without touching any code.
- **Automated GitHub Sync:** Connect your GitHub account via the Admin Panel to automatically fetch, sync, and organize all your repositories into beautiful project cards.
- **Dynamic Contact Form & Notifications:** Visitors can send you messages directly from the site. Messages are saved to your Supabase database, and you receive real-time email notifications powered by **EmailJS**.
- **Live GitHub Stats:** Real-time fetching of your GitHub followers, public repos, and total contributions displayed in an animated statistics bar.
- **Premium UI/UX:** Features a modern dark mode, sleek glassmorphism cards, glowing timeline elements, and satisfying micro-animations.
- **Image Cropper Tool:** Built-in photo upload functionality with an integrated image cropper to ensure perfect, high-quality, circular profile pictures stored securely in Supabase Storage.
- **Fully Responsive:** Looks and functions perfectly on desktops, tablets, and mobile devices.

## 🛠️ Technologies Used

- **HTML5 & CSS3 (Vanilla)** for premium styling, grid/flexbox, animations, and themes.
- **JavaScript (ES6+)** for dynamic data injection, state management, API handling, and the typing animation.
- **Supabase SDK** for Database persistence, Storage buckets, and Admin Authentication.
- **EmailJS** for client-side email notifications.
- **GitHub REST API** for live stat tracking and automated repository synchronization.
- **Cropper.js** for handling frontend image cropping.

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
2. Log in using your registered Supabase administrator credentials.
3. Use the dashboard to:
   - Update your hero text, bio, and resume timeline.
   - Upload a new photo or PDF resume (saved to Supabase Storage).
   - Sync your latest GitHub repositories.
   - Read and manage contact messages sent by visitors.
4. Click **Save**. Your changes will immediately reflect on the main `index.html` page globally!

---
*Designed & developed by [Siddharth Gupta](https://github.com/thesiddharthagupta).*
