# Finish By

**A guilt-free accountability system for finishing books**

For people who buy books but don't finish them.

## Features

- ✅ Adaptive pacing that recalculates when you miss days
- ✅ Commitment levels (Gentle, Balanced, Intense) instead of rigid daily reading
- ✅ Buffer days built into your plan
- ✅ No guilt messaging - "Life happens. We've recalculated."
- ✅ Progress tracking without pressure
- ✅ Suggested reading windows
- ✅ Clean, calm interface

## Prerequisites

Before you start, make sure you have:

- **Node.js** version 18 or higher ([Download here](https://nodejs.org/))
- **npm** version 9 or higher (comes with Node.js)
- **Git** ([Download here](https://git-scm.com/))

### Check your versions:

```bash
node --version   # Should show v18 or higher
npm --version    # Should show v9 or higher
git --version    # Any recent version is fine
```

## Quick Start (5 minutes)

### 1. Clone or Download this project

**Option A: If you have this as a folder**
- Open your terminal/command prompt
- Navigate to this folder:
  ```bash
  cd path/to/finish-by-project
  ```

**Option B: If you're starting from GitHub**
```bash
git clone https://github.com/YOUR-USERNAME/finish-by.git
cd finish-by
```

### 2. Install Dependencies

This is like running `mvn install` in Java:

```bash
npm install
```

This will download all required packages (~200MB). Takes 1-2 minutes.

### 3. Run the Development Server

```bash
npm run dev
```

You should see:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.1.X:3000/
```

The app will automatically open in your browser at `http://localhost:3000`

**To test on your phone:** Use the Network URL on your phone (make sure you're on the same WiFi)

### 4. Make Changes

- Edit files in `src/` folder
- The app will auto-reload when you save
- All changes appear instantly (hot module replacement)

### 5. Stop the Server

Press `Ctrl+C` in the terminal

## Project Structure

```
finish-by-project/
├── src/
│   ├── App.jsx          # Main application code (the Finish By app)
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles & Tailwind imports
├── index.html           # HTML template
├── package.json         # Dependencies (like pom.xml in Maven)
├── vite.config.js       # Build tool configuration
├── tailwind.config.js   # Styling configuration
└── README.md           # This file
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies (do this first!) |
| `npm run dev` | Start development server |
| `npm run build` | Create production build (outputs to `dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Check code for errors |

## Testing Your App

### Local Testing
1. Run `npm run dev`
2. Add a book with different commitment levels
3. Update your progress
4. Refresh the page - data should persist
5. Try different browsers (Chrome, Safari, Firefox)

### Mobile Testing
1. Run `npm run dev`
2. Look for the "Network" URL in the terminal
3. Open that URL on your phone (same WiFi network)
4. Test touch interactions and responsiveness

## How Data Persistence Works

The app uses the browser's `localStorage` to save your books. This means:
- ✅ Data persists when you close the browser
- ✅ Works offline
- ❌ Data is only on YOUR device (not synced)
- ❌ Clearing browser data will delete your books

*For cloud sync across devices, you'll need to add Supabase or Firebase (covered in deployment docs)*

## Deployment

### Deploy to Vercel (Recommended - Free)

1. Create account at [vercel.com](https://vercel.com)
2. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
3. Deploy:
   ```bash
   vercel
   ```
4. Follow prompts - your app will be live in 30 seconds!

### Deploy to Netlify (Alternative - Free)

1. Build your app:
   ```bash
   npm run build
   ```
2. Go to [netlify.com](https://netlify.com)
3. Drag and drop the `dist/` folder
4. Done!

## Connecting to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# First commit
git commit -m "Initial commit - Finish By MVP"

# Create a new repository on GitHub.com, then:
git remote add origin https://github.com/YOUR-USERNAME/finish-by.git
git branch -M main
git push -u origin main
```

## Common Issues

### "npm: command not found"
- Node.js is not installed. Download from [nodejs.org](https://nodejs.org/)

### "Port 3000 is already in use"
- Another app is using port 3000
- Kill that process or edit `vite.config.js` to use a different port

### "Module not found" errors
- Run `npm install` again
- Delete `node_modules` folder and run `npm install`

### Changes not appearing
- Make sure dev server is running (`npm run dev`)
- Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Check terminal for errors

### Data disappeared
- Check browser console (F12) for errors
- Make sure you're using the same browser
- Check if you cleared browser data

## Learn More

- **React**: https://react.dev/learn
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Vite**: https://vitejs.dev/guide/

## Next Steps

1. ✅ Get the app running locally
2. ✅ Test all features
3. ✅ Deploy to Vercel or Netlify
4. ✅ Share with 5-10 friends for feedback
5. 📋 Read `product-spec.md` for roadmap
6. 📋 Read `deployment-strategy.md` for launch plan

## Support

- **Email**: hello@finishby.app
- **Issues**: Use GitHub Issues if you encounter bugs
- **Feedback**: We'd love to hear from you!

---

Built with ❤️ for readers who want to finish books without guilt.
