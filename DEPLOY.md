# Foxling Admin Panel — Deployment Guide

## First-time Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Test locally
```bash
npm run dev
```
Open http://localhost:5173

### 3. Create admin user in Firebase
Go to Firebase Console → foxling-44ccf → Authentication → Add user
- Email: admin@foxling.app (or your email)
- Password: choose a strong password

### 4. Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 5. Build for production
```bash
npm run build
```

### 6. Deploy to Firebase Hosting
```bash
firebase deploy --only hosting
```

Your admin panel will be live at:
https://foxling-44ccf.web.app

### 7. Deploy Firestore rules
```bash
firebase deploy --only firestore:rules
```

## After Deployment

- Admin panel URL: https://foxling-44ccf.web.app
- Login with your Firebase Auth email + password
- Content created here goes directly into Firestore
- Foxling app reads from same Firestore → content appears instantly!

## Custom Domain (Optional)
Firebase Console → Hosting → Add custom domain
e.g. admin.foxling.app
