# 🚀 DailyClips - Simple Static Site

A basic adult video site template that works immediately when uploaded to Netlify.

## 📁 What's Included

- **4 video pages** with embedded content
- **Popunder ads** (Adsterra/ExoClick)
- **Banner ads** 
- **Responsive design** for mobile
- **Simple structure** - no backend needed

## 🚀 How to Deploy

### **Step 1: Upload to Netlify**
1. Go to [netlify.com](https://netlify.com)
2. Sign up/login
3. Drag and drop this entire folder to the deploy area
4. Wait for deployment (usually 1-2 minutes)

### **Step 2: Done!**
Your site will be live at `https://yoursite.netlify.app`

## 📝 How to Add New Videos

1. **Copy** any video HTML file from `videos/` folder
2. **Rename** it (e.g., `new-video.html`)
3. **Edit** the title, description, and iframe
4. **Add thumbnail** to `assets/` folder
5. **Update** `index.html` with new video card

## 🎯 File Structure

```
adult-site-starter/
├── index.html          # Main page
├── assets/
│   ├── styles.css      # Styling
│   └── thumb*.webp     # Thumbnails
├── videos/
│   ├── first-video.html
│   ├── second-video.html
│   ├── third-video.html
│   └── fourth-video.html
└── legal.html          # Legal page
```

## 💰 Ad Integration

- **Popunder ads** are in the `<head>` section
- **Banner ads** are in the `banner-slot` div
- Replace the ad codes with your own from Adsterra/ExoClick

## 📱 Mobile Optimized

- Responsive grid layout
- Touch-friendly buttons
- Optimized for Telegram in-app browser

---

**That's it!** No complex setup, no backend, no functions. Just upload and it works! 🎉
