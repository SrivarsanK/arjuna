# Project Arjuna Control - React Native App

A React Native mobile app for disaster rescue teams to manage precision laser-guided drone deliveries. Built with Expo, TypeScript, and Supabase.

## 🚀 Features

### Stage 1 - Authentication & Foundation ✅
- **User Authentication**: Sign up, sign in, password reset
- **Persistent Sessions**: Auto-login with secure token storage
- **Profile Management**: Rescue team ID and role-based access
- **Clean UI**: Emergency-focused design with large touch targets

### Coming Soon (Stage 2-7)
- Mission Dashboard & Navigation
- Mission Creation Form
- Real-time Mission Tracking
- Mission Management & History
- Push Notifications & Alerts
- Advanced Features & Polish

## 📱 Screenshots

*Screenshots will be added as features are completed*

## 🛠 Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation v6
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **State Management**: React Context API
- **Styling**: React Native StyleSheet
- **Icons**: Expo Vector Icons

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ProjectArjunaControl
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your Supabase credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase database**
   
   Run the following SQL in your Supabase SQL editor:
   
   ```sql
   -- Enable UUID extension
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   
   -- Profiles table (extends Supabase auth.users)
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
     name TEXT NOT NULL,
     rescue_team_id TEXT,
     role TEXT DEFAULT 'operator' CHECK (role IN ('operator', 'coordinator', 'admin')),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   -- Missions table (for Stage 2+)
   CREATE TABLE missions (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     created_by UUID REFERENCES profiles(id) NOT NULL,
     recipient_name TEXT NOT NULL,
     contact_info TEXT,
     supply_type TEXT NOT NULL CHECK (supply_type IN ('medicine', 'communication_device', 'food', 'water', 'emergency_kit', 'custom')),
     priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'emergency')),
     status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'failed', 'emergency')),
     target_location JSONB NOT NULL,
     laser_code TEXT,
     special_notes TEXT,
     quantity INTEGER DEFAULT 1,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   -- Mission tracking table (for Stage 4+)
   CREATE TABLE mission_tracking (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
     latitude DECIMAL(10,8) NOT NULL,
     longitude DECIMAL(11,8) NOT NULL,
     altitude DECIMAL(7,2),
     battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
     speed DECIMAL(5,2),
     timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   -- Mission logs table (for Stage 5+)
   CREATE TABLE mission_logs (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
     event_type TEXT NOT NULL,
     description TEXT,
     timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   -- Row Level Security (RLS)
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE mission_tracking ENABLE ROW LEVEL SECURITY;
   ALTER TABLE mission_logs ENABLE ROW LEVEL SECURITY;
   
   -- Policies for profiles
   CREATE POLICY "Public profiles are viewable by everyone" ON profiles
     FOR SELECT USING (true);
   
   CREATE POLICY "Users can insert their own profile" ON profiles
     FOR INSERT WITH CHECK (auth.uid() = id);
   
   CREATE POLICY "Users can update own profile" ON profiles
     FOR UPDATE USING (auth.uid() = id);
   
   -- Policies for missions (basic - will be refined in later stages)
   CREATE POLICY "Users can view missions" ON missions
     FOR SELECT USING (true);
   
   CREATE POLICY "Users can create missions" ON missions
     FOR INSERT WITH CHECK (auth.uid() = created_by);
   
   -- Trigger to automatically update updated_at
   CREATE OR REPLACE FUNCTION update_updated_at_column()
   RETURNS TRIGGER AS $$
   BEGIN
     NEW.updated_at = NOW();
     RETURN NEW;
   END;
   $$ language 'plpgsql';
   
   CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON missions
     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
   ```

5. **Start the development server**
   ```bash
   npx expo start
   ```

6. **Run on device/simulator**
   - Scan QR code with Expo Go app (iOS/Android)
   - Press `i` for iOS simulator
   - Press `a` for Android emulator

## 📝 Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# App Configuration
EXPO_PUBLIC_APP_NAME=Project Arjuna Control
EXPO_PUBLIC_APP_VERSION=1.0.0

# Environment
EXPO_PUBLIC_ENVIRONMENT=development

# API Endpoints (for future use)
EXPO_PUBLIC_API_BASE_URL=https://api.projectarjuna.com

# Firebase/Push Notifications (for future use)
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id

# Map API Keys (for future use)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## 🏗 Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
│   ├── WelcomeScreen.tsx
│   ├── LoginScreen.tsx
│   ├── RegisterScreen.tsx
│   ├── ForgotPasswordScreen.tsx
│   └── MainScreens.tsx
├── navigation/         # Navigation configuration
│   ├── AuthStack.tsx
│   ├── MainTabs.tsx
│   └── RootNavigator.tsx
├── services/           # API and external services
│   ├── supabaseClient.ts
│   └── authService.ts
├── hooks/              # Custom React hooks
│   └── useAuth.tsx
├── utils/              # Utility functions
├── constants/          # App constants and themes
│   └── index.ts
└── types/              # TypeScript type definitions
    └── index.ts
```

## 🔐 Authentication Flow

1. **Welcome Screen**: App introduction with sign-in/sign-up options
2. **Registration**: Create account with name, email, password, and optional rescue team ID
3. **Login**: Authenticate with email and password
4. **Password Reset**: Email-based password recovery
5. **Persistent Session**: Auto-login on app restart

## 📱 Stage 1 Features

### ✅ Completed
- [x] Project setup with Expo and TypeScript
- [x] Supabase integration and configuration
- [x] Authentication service implementation
- [x] Welcome/Splash screen with Project Arjuna branding
- [x] Login screen with email/password authentication
- [x] Registration screen with team ID support
- [x] Password reset functionality
- [x] Stack navigation for auth screens
- [x] Context API for authentication state management
- [x] Persistent login state
- [x] Clean, emergency-focused UI design
- [x] Error handling and validation

### 🎯 Testing Checklist
- [ ] User can register new account
- [ ] User can login with credentials
- [ ] User can reset password via email
- [ ] User stays logged in after app restart
- [ ] User can logout successfully
- [ ] Form validation works correctly
- [ ] Loading states display properly
- [ ] Error messages are clear and helpful

## 🚧 Next Steps (Stage 2)

### Mission Dashboard & Navigation
- Bottom tab navigation (Dashboard, New Mission, Live Tracking, Profile)
- Dashboard with mission statistics and recent missions
- Mission status indicators and badges
- Basic mission list display

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/stage-2-dashboard`)
3. Commit changes (`git commit -am 'Add dashboard screen'`)
4. Push to branch (`git push origin feature/stage-2-dashboard`)
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:
1. Check existing [Issues](https://github.com/your-repo/issues)
2. Create a new issue with detailed description
3. Include device info and error messages

## 🚀 Deployment

### Development Build
```bash
npx expo run:ios
npx expo run:android
```

### Production Build
```bash
eas build --platform all
```

---

**Project Arjuna Control** - Precision drone deliveries for disaster relief operations.
