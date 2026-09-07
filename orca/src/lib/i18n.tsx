import React, { createContext, useContext, useState } from 'react';

type Translations = Record<string, Record<string, string>>;

const translations: Translations = {
  en: {
    dashboard: 'Dashboard', geofence: 'Geofence', navigation: 'Navigation', alerts: 'Alerts',
    settings: 'Settings', logout: 'Logout', language: 'Language', select_language: 'Select your preferred language',
    sign_out: 'Sign out of your account', ocean_risk: 'Ocean Risk & Conservation Assistant',
    welcome: 'Welcome to ORCA', manage_app: 'Manage your app preferences and account',
    getting_location: 'Getting Location...', loading_api: 'Loading API Data...',
    location_error: 'Location Error', backend_offline: 'Backend offline',
    login_welcome: 'Welcome to ORCA', login_desc: 'Sign in to access your marine dashboard and real-time PFZ alerts.',
    full_name: 'Full Name', username: 'Username', email_addr: 'Email Address', password: 'Password',
    forgot_pass: 'Forgot password?', sign_in: 'Sign In', authenticating: 'Authenticating...',
    no_account: "Don't have an account?", register_vessel: 'Register Vessel',
    sst: 'SST', sst_sub: 'Sea Surface Temp', chloro: 'Chlorophyll', chloro_sub: 'Concentration (mg/m³)',
    waves: 'Waves', waves_sub: 'Wave Height', wind: 'Wind', wind_sub: 'Wind Speed',
    risk: 'Risk', risk_sub: 'Safety Level', loading: 'Loading', ask_orca: 'Ask ORCA AI...',
    distance: 'Distance', eta: 'ETA', hours: 'hrs', distance_left: 'Distance Left'
  },
  hi: {
    dashboard: 'डैशबोर्ड', geofence: 'जियोफेंस', navigation: 'नेविगेशन', alerts: 'अलर्ट',
    settings: 'सेटिंग्स', logout: 'लॉग आउट', language: 'भाषा', select_language: 'अपनी पसंदीदा भाषा चुनें',
    sign_out: 'खाते से साइन आउट करें', ocean_risk: 'महासागर जोखिम संरक्षण सहायक',
    welcome: 'ORCA में आपका स्वागत है', manage_app: 'अपनी ऐप प्राथमिकताओं को प्रबंधित करें',
    getting_location: 'स्थान प्राप्त कर रहा है...', loading_api: 'API डेटा लोड हो रहा है...',
    location_error: 'स्थान त्रुटि', backend_offline: 'बैकएंड ऑफ़लाइन है',
    login_welcome: 'ORCA में आपका स्वागत है', login_desc: 'अपने समुद्री डैशबोर्ड और रीयल-टाइम PFZ अलर्ट तक पहुंचने के लिए साइन इन करें।',
    full_name: 'पूरा नाम', username: 'उपयोगकर्ता नाम', email_addr: 'ईमेल पता', password: 'पासवर्ड',
    forgot_pass: 'पासवर्ड भूल गए?', sign_in: 'साइन इन करें', authenticating: 'प्रमाणीकरण हो रहा है...',
    no_account: "क्या आपके पास खाता नहीं है?", register_vessel: 'जहाज पंजीकृत करें',
    sst: 'SST', sst_sub: 'समुद्र सतह का तापमान', chloro: 'क्लोरोफिल', chloro_sub: 'एकाग्रता (mg/m³)',
    waves: 'लहरें', waves_sub: 'लहर की ऊंचाई', wind: 'हवा', wind_sub: 'हवा की गति',
    risk: 'जोखिम', risk_sub: 'सुरक्षा स्तर', loading: 'लोड हो रहा है', ask_orca: 'ORCA AI से पूछें...',
    distance: 'दूरी', eta: 'आगमन का समय', hours: 'घंटे', distance_left: 'बची हुई दूरी'
  },
  ta: {
    dashboard: 'கட்டுப்பாட்டு அறை', geofence: 'ஜியோஃபென்ஸ்', navigation: 'வழிசெலுத்தல்', alerts: 'எச்சரிக்கைகள்',
    settings: 'அமைப்புகள்', logout: 'வெளியேறு', language: 'மொழி', select_language: 'விருப்ப மொழியைத் தேர்ந்தெடுக்கவும்',
    sign_out: 'உங்கள் கணக்கிலிருந்து வெளியேறவும்', ocean_risk: 'பெருங்கடல் ஆபத்து பாதுகாப்பு உதவியாளர்',
    welcome: 'ORCA விற்கு வருக', manage_app: 'பயன்பாட்டு விருப்பங்களை நிர்வகிக்கவும்',
    getting_location: 'இடத்தைப் பெறுகிறது...', loading_api: 'தரவு ஏற்றப்படுகிறது...',
    location_error: 'இருப்பிடப் பிழை', backend_offline: 'பின்னணி ஆஃப்லைனில் உள்ளது',
    login_welcome: 'ORCA விற்கு வருக', login_desc: 'கடல் கட்டுப்பாட்டு அறை மற்றும் PFZ எச்சரிக்கைகளை அணுக உள்நுழைக.',
    full_name: 'முழு பெயர்', username: 'பயனர்பெயர்', email_addr: 'மின்னஞ்சல் முகவரி', password: 'கடவுச்சொல்',
    forgot_pass: 'கடவுச்சொல் மறந்துவிட்டதா?', sign_in: 'உள்நுழைக', authenticating: 'அங்கீகரிக்கப்படுகிறது...',
    no_account: "கணக்கு இல்லையா?", register_vessel: 'கப்பலை பதிவு செய்',
    sst: 'SST', sst_sub: 'கடல் மேற்பரப்பு வெப்பநிலை', chloro: 'குளோரோபில்', chloro_sub: 'செறிவு (mg/m³)',
    waves: 'அலைகள்', waves_sub: 'அலை உயரம்', wind: 'காற்று', wind_sub: 'காற்றின் வேகம்',
    risk: 'ஆபத்து', risk_sub: 'பாதுகாப்பு நிலை', loading: 'ஏற்றப்படுகிறது', ask_orca: 'ORCA AI யிடம் கேளுங்கள்...',
    distance: 'தூரம்', eta: 'வந்தடையும் நேரம்', hours: 'மணி', distance_left: 'மீதமுள்ள தூரம்'
  },
  te: {
    dashboard: 'డాష్‌బోర్డ్', geofence: 'జియోఫెన్స్', navigation: 'నావిగేషన్', alerts: 'హెచ్చరికలు',
    settings: 'సెట్టింగులు', logout: 'లాగ్ అవుట్', language: 'భాష', select_language: 'ఇష్టమైన భాషను ఎంచుకోండి',
    sign_out: 'మీ ఖాతా నుండి సైన్ అవుట్ చేయండి', ocean_risk: 'సముద్ర ప్రమాద సంరక్షణ సహాయకుడు',
    welcome: 'ORCA కు స్వాగతం', manage_app: 'మీ అనువర్తన ప్రాధాన్యతలను నిర్వహించండి',
    getting_location: 'స్థానాన్ని పొందుతోంది...', loading_api: 'డేటా లోడ్ అవుతోంది...',
    location_error: 'స్థాన లోపం', backend_offline: 'బ్యాకెండ్ ఆఫ్‌లైన్‌లో ఉంది',
    login_welcome: 'ORCA కు స్వాగతం', login_desc: 'సముద్ర డాష్‌బోర్డ్ మరియు PFZ హెచ్చరికలను యాక్సెస్ చేయడానికి సైన్ ఇన్ చేయండి.',
    full_name: 'పూర్తి పేరు', username: 'వినియోగదారు పేరు', email_addr: 'ఇమెయిల్ చిరునామా', password: 'పాస్‌వర్డ్',
    forgot_pass: 'పాస్‌వర్డ్ మర్చిపోయారా?', sign_in: 'సైన్ ఇన్ చేయండి', authenticating: 'ప్రామాణీకరించబడుతోంది...',
    no_account: "ఖాతా లేదా?", register_vessel: 'నౌకను నమోదు చేయండి',
    sst: 'SST', sst_sub: 'సముద్ర ఉపరితల ఉష్ణోగ్రత', chloro: 'క్లోరోఫిల్', chloro_sub: 'గాఢత (mg/m³)',
    waves: 'అలలు', waves_sub: 'అలల ఎత్తు', wind: 'గాలి', wind_sub: 'గాలి వేగం',
    risk: 'ప్రమాదం', risk_sub: 'భద్రతా స్థాయి', loading: 'లోడ్ అవుతోంది', ask_orca: 'ORCA AI ని అడగండి...',
    distance: 'దూరం', eta: 'వచ్చే సమయం', hours: 'గంటలు', distance_left: 'మిగిలిన దూరం'
  },
  bn: {
    dashboard: 'ড্যাশবোর্ড', geofence: 'জিওফেন্স', navigation: 'নেভিগেশন', alerts: 'সতর্কতা',
    settings: 'সেটিংস', logout: 'লগ আউট', language: 'ভাষা', select_language: 'আপনার পছন্দের ভাষা নির্বাচন করুন',
    sign_out: 'আপনার অ্যাকাউন্ট থেকে সাইন আউট করুন', ocean_risk: 'মহাসাগর ঝুঁকি ও সংরক্ষণ সহকারী',
    welcome: 'ORCA-তে স্বাগতম', manage_app: 'আপনার অ্যাপ্লিকেশন পছন্দগুলি পরিচালনা করুন',
    getting_location: 'অবস্থান পাওয়া যাচ্ছে...', loading_api: 'ডেটা লোড হচ্ছে...',
    location_error: 'অবস্থান ত্রুটি', backend_offline: 'ব্যাকএন্ড অফলাইনে আছে',
    login_welcome: 'ORCA-তে স্বাগতম', login_desc: 'আপনার মেরিন ড্যাশবোর্ড এবং PFZ সতর্কতা অ্যাক্সেস করতে সাইন ইন করুন।',
    full_name: 'পুরো নাম', username: 'ব্যবহারকারীর নাম', email_addr: 'ইমেল ঠিকানা', password: 'পাসওয়ার্ড',
    forgot_pass: 'পাসওয়ার্ড ভুলে গেছেন?', sign_in: 'প্রবেশ করুন', authenticating: 'প্রমাণীকরণ চলছে...',
    no_account: "অ্যাকাউন্ট নেই?", register_vessel: 'জাহাজ নিবন্ধন করুন',
    sst: 'SST', sst_sub: 'সমুদ্রপৃষ্ঠের তাপমাত্রা', chloro: 'ক্লোরোফিল', chloro_sub: 'ঘনত্ব (mg/m³)',
    waves: 'ঢেউ', waves_sub: 'ঢেউয়ের উচ্চতা', wind: 'বাতাস', wind_sub: 'বাতাসের গতি',
    risk: 'ঝুঁকি', risk_sub: 'নিরাপত্তা স্তর', loading: 'লোড হচ্ছে', ask_orca: 'ORCA AI কে জিজ্ঞাসা করুন...',
    distance: 'দূরত্ব', eta: 'আগমনের সময়', hours: 'ঘন্টা', distance_left: 'বাকি দূরত্ব'
  }
};

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Use localStorage to persist language choice
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('orca_lang') || 'en';
  });

  const setLanguage = (lang: string) => {
    localStorage.setItem('orca_lang', lang);
    setLanguageState(lang);
  };

  const t = (key: string) => {
    return translations[language]?.[key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
