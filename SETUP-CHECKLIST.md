# Setup Checklist - Complete This First!

Use this to track your setup progress.

## ☐ Prerequisites

- [ ] Node.js installed (v18 or higher)
  - Verify: `node --version`
  - Download: https://nodejs.org/

- [ ] npm installed (comes with Node)
  - Verify: `npm --version`

- [ ] VS Code installed
  - Download: https://code.visualstudio.com/

- [ ] VS Code Extensions installed:
  - [ ] ES7+ React snippets
  - [ ] Tailwind CSS IntelliSense
  - [ ] Prettier
  - [ ] GitLens (optional)

## ☐ Project Setup

- [ ] Project folder opened in VS Code
- [ ] Terminal opened in VS Code (Terminal → New Terminal)
- [ ] Dependencies installed
  - Run: `npm install` or `./setup.sh`
  - Wait for completion (1-2 minutes)
  - Look for "added XXX packages" message

## ☐ First Run

- [ ] Development server started
  - Run: `npm run dev`
  - See URL in terminal
  - Browser opens automatically

- [ ] App loads successfully
  - No errors in browser console (F12)
  - See "Finish By" heading
  - See "Add your first book" button

## ☐ Test Basic Functionality

- [ ] Can add a book
  - Title: "Test Book"
  - Pages: 300
  - Any commitment level
  - Any speed
  - Click "Add Book"

- [ ] Book appears on dashboard
  - See daily target
  - See progress bar
  - See days remaining

- [ ] Can update progress
  - Click "Update Progress"
  - Enter page number
  - Click "Save"

- [ ] Data persists
  - Refresh the page (F5)
  - Book still there with same data

## ☐ Mobile Testing

- [ ] Got Network URL from terminal
- [ ] Opened on phone (same WiFi)
- [ ] App loads on mobile
- [ ] Touch interactions work
- [ ] Responsive design looks good

## ☐ Development Workflow

- [ ] Made a code change in src/App.jsx
- [ ] Saved file (Ctrl+S)
- [ ] Saw browser auto-refresh
- [ ] Change appeared immediately

- [ ] Checked browser console (F12)
  - No red errors
  - Only expected messages

## ☐ Git Setup (Optional but Recommended)

- [ ] Git installed
  - Verify: `git --version`
  - Download: https://git-scm.com/

- [ ] Repository initialized
  - Run: `git init`

- [ ] First commit made
  ```bash
  git add .
  git commit -m "Initial setup"
  ```

- [ ] GitHub account created (if needed)
  - https://github.com/signup

- [ ] Repository created on GitHub

- [ ] Connected to GitHub
  ```bash
  git remote add origin YOUR_REPO_URL
  git push -u origin main
  ```

## ☐ Deployment (Optional - Can Do Later)

- [ ] Vercel account created
  - https://vercel.com

- [ ] Project deployed
  - Import from GitHub
  - Auto-deploy configured

- [ ] Custom domain configured (if desired)
  - Domain purchased
  - DNS configured
  - SSL certificate active

## ☐ Next Steps Planning

- [ ] Read algorithm-spec.md
- [ ] Read product-spec.md
- [ ] Read deployment-strategy.md
- [ ] Plan first feature to add
- [ ] Set timeline for beta launch

## 🎯 Success Criteria

You're ready to develop when ALL of these work:

1. ✅ `npm run dev` starts without errors
2. ✅ App opens in browser automatically
3. ✅ Can add, view, and update books
4. ✅ Data saves when you refresh
5. ✅ No console errors (F12)

---

## 🆘 If You're Stuck

### Node.js Issues
```bash
# Reinstall Node.js from nodejs.org
# Restart computer
# Try again
```

### Dependency Issues
```bash
# Delete node_modules and try again
rm -rf node_modules package-lock.json
npm install
```

### Port Issues
```javascript
// Edit vite.config.js
server: {
  port: 3001,  // Changed from 3000
  // ...
}
```

### Git Issues
```bash
# Make sure git is installed
git --version

# Initialize if needed
git init

# Check remote
git remote -v
```

---

**Once this checklist is complete, you're ready to ship!** 🚀

See QUICKSTART.md if you need step-by-step instructions.
See README.md for comprehensive documentation.
