# Tournament App - BGMI Style Gaming Platform

A modern, feature-rich tournament management platform built with HTML5, CSS3, JavaScript, and Firebase. This app provides both user and admin panels for managing gaming tournaments with real-time updates, wallet management, and comprehensive admin controls.

## 🎮 Features

### User Panel
- **Modern BGMI-style UI** with dark theme and attractive gradients
- **User Authentication** with email/password and social login options
- **Tournament Browsing** with filters (Solo, Duo, Squad, My Created)
- **Wallet Management** with three buckets: Deposit, Winning, Bonus
- **Tournament Joining** with automatic fee deduction from wallet buckets
- **Real-time Updates** for tournament status and room information
- **Profile Management** with referral system
- **Responsive Design** for mobile and desktop

### Admin Panel
- **Comprehensive Dashboard** with statistics and recent activity
- **Tournament Management** - Create, edit, copy, and delete tournaments
- **User Management** with search and filtering capabilities
- **Payment Processing** - Approve/reject deposits and withdrawals
- **App Settings** - Maintenance mode, payment methods, support links
- **Real-time Monitoring** of all platform activities

### Core Features
- **Firebase Integration** for real-time database and authentication
- **Wallet System** with priority-based fee deduction
- **Maintenance Mode** for system updates
- **Multi-language Support** (English/Nepali)
- **Push Notifications** (Firebase Cloud Messaging)
- **Secure Admin Access** with custom claims
- **Transaction History** with detailed tracking

## 🚀 Quick Start

### Prerequisites
- Firebase project with Firestore database
- Web server (local or hosted)
- Modern web browser

### Setup Instructions

1. **Clone or Download the Project**
   ```bash
   git clone <repository-url>
   cd tournament-app
   ```

2. **Firebase Configuration**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Enable Storage (for file uploads)
   - Enable Cloud Messaging (for notifications)

3. **Update Firebase Config**
   - Open `firebase-config.js`
   - Replace the placeholder values with your Firebase project credentials:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.appspot.com",
       messagingSenderId: "YOUR_SENDER_ID",
       appId: "YOUR_APP_ID"
   };
   ```

4. **Set Up Firestore Security Rules**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can only access their own data
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Admins can access all data
       match /{document=**} {
         allow read, write: if request.auth != null && 
           (request.auth.token.admin == true || 
            resource.data.adminUids[request.auth.uid] == true);
       }
     }
   }
   ```

5. **Initialize Database Structure**
   - Create the following collections in Firestore:
     - `users` - User profiles and wallet data
     - `tournaments` - Tournament information
     - `transactions` - Payment and transaction history
     - `settings` - App configuration
     - `games` - Available games list

6. **Set Up Admin Users**
   - Create admin users through Firebase Authentication
   - Add admin UIDs to the `settings/app-settings` document:
   ```javascript
   {
     "adminUids": ["admin_user_uid_1", "admin_user_uid_2"],
     "appName": "Tournament App",
     "maintenanceMode": false,
     "depositEnabled": true,
     "withdrawalEnabled": true
   }
   ```

7. **Deploy to Web Server**
   - Upload all files to your web server
   - Ensure HTTPS is enabled for Firebase services
   - Test the application

## 📁 Project Structure

```
tournament-app/
├── firebase-config.js          # Firebase configuration
├── user/                       # User panel files
│   ├── index.html             # User login page
│   ├── dashboard.html         # User dashboard
│   ├── style.css              # User panel styles
│   └── script.js              # User panel functionality
├── admin/                      # Admin panel files
│   ├── index.html             # Admin login page
│   ├── dashboard.html         # Admin dashboard
│   ├── style.css              # Admin panel styles
│   └── script.js              # Admin panel functionality
└── README.md                  # This file
```

## 🎯 Usage Guide

### For Users
1. **Registration/Login**: Create an account or login with existing credentials
2. **Browse Tournaments**: View available tournaments with filters
3. **Join Tournaments**: Click join and confirm entry fee deduction
4. **Manage Wallet**: Add funds, withdraw winnings, view transaction history
5. **Profile**: Update profile, share referral code, access support

### For Admins
1. **Admin Login**: Use admin credentials to access admin panel
2. **Dashboard**: View platform statistics and recent activity
3. **Tournament Management**: Create, edit, and manage tournaments
4. **User Management**: Monitor users, view profiles, manage accounts
5. **Payment Processing**: Approve/reject deposits and withdrawals
6. **Settings**: Configure app settings, payment methods, support links

## 🔧 Configuration

### App Settings
The app can be configured through the admin panel or directly in Firestore:

```javascript
// settings/app-settings document
{
  "appName": "Tournament App",
  "maintenanceMode": false,
  "depositEnabled": true,
  "withdrawalEnabled": true,
  "adminUids": ["admin_uid_1", "admin_uid_2"],
  "defaultJoinFeePriority": ["winning", "bonus", "deposit"],
  "defaultPrizeCreditBucket": "winning",
  "whatsappUrl": "https://wa.me/your-number",
  "facebookUrl": "https://facebook.com/your-page",
  "youtubeUrl": "https://youtube.com/your-channel"
}
```

### Tournament Structure
```javascript
// tournaments collection
{
  "name": "Tournament Name",
  "type": "Solo|Duo|Squad",
  "entryFee": 100,
  "prizePool": 1000,
  "maxPlayers": 50,
  "currentPlayers": 0,
  "startTime": timestamp,
  "endTime": timestamp,
  "status": "upcoming|ongoing|finished|cancelled",
  "roomCode": "ABC123",
  "roomPassword": "password123",
  "createdBy": "admin_uid",
  "createdAt": timestamp
}
```

## 🎨 Customization

### Styling
The app uses CSS variables for easy theming. Modify the variables in `style.css`:

```css
:root {
  --primary-color: #ff6b35;
  --secondary-color: #f7931e;
  --background-dark: #0a0a0a;
  /* Add more custom colors */
}
```

### Language Support
Add new languages by:
1. Creating language files with translations
2. Updating the language selector
3. Implementing translation functions

## 🔒 Security Features

- **Firebase Authentication** for secure user management
- **Custom Claims** for admin access control
- **Firestore Security Rules** for data protection
- **Input Validation** and sanitization
- **HTTPS Enforcement** for secure connections

## 📱 Mobile Responsiveness

The app is fully responsive and optimized for:
- Mobile phones (320px+)
- Tablets (768px+)
- Desktop computers (1024px+)

## 🚀 Deployment

### Local Development
1. Use a local web server (e.g., Live Server in VS Code)
2. Ensure Firebase project is properly configured
3. Test all features locally

### Production Deployment
1. Upload files to web hosting service
2. Configure custom domain with SSL
3. Update Firebase configuration for production
4. Set up monitoring and analytics

## 🐛 Troubleshooting

### Common Issues
1. **Firebase not initialized**: Check firebase-config.js configuration
2. **Authentication errors**: Verify Firebase Authentication settings
3. **Database access denied**: Check Firestore security rules
4. **Admin access issues**: Verify admin UIDs in settings

### Debug Mode
Enable debug logging by adding to browser console:
```javascript
localStorage.setItem('debug', 'true');
```

## 📞 Support

For support and questions:
- Check the admin panel support links
- Review Firebase documentation
- Contact the development team

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔄 Updates

### Version 1.0.0
- Initial release with core features
- User and admin panels
- Tournament management system
- Wallet and payment processing
- Responsive design

### Planned Features
- Advanced tournament types
- Live streaming integration
- Advanced analytics
- Mobile app versions
- Multi-game support

---

**Built with ❤️ for the gaming community**