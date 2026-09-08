import React, { createContext, useContext, useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const LanguageContext = createContext();
const LANGUAGE_STORAGE_KEY = 'app_language';
const isSupportedLanguage = (value) => value === 'bn' || value === 'en';

const getStoredLanguage = () => {
  try {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(storedLanguage) ? storedLanguage : null;
  } catch {
    return null;
  }
};

const translations = {
  bn: {
    // Navigation
    home: 'হোম',
    khata: 'বাকীর খাতা',
    cashbox: 'ক্যাশবক্স',
    transactions: 'লেনদেন',
    settings: 'সেটিংস',
    
    // Dashboard
    dashboard: 'ড্যাশবোর্ড',
    businessSummary: 'আপনার ব্যবসার সারসংক্ষেপ',
    totalReceivable: 'মোট পাবো',
    totalPayable: 'মোট দেবো',
    cashBalance: 'ক্যাশ ব্যালেন্স',
    totalParties: 'মোট পার্টি',
    weeklyIncomeExpense: 'সাপ্তাহিক আয়-ব্যয়',
    recentTransactions: 'সাম্প্রতিক লেনদেন',
    viewAll: 'সব দেখুন',
    noTransactions: 'কোনো লেনদেন নেই',
    
    // Common
    save: 'সেভ করুন',
    cancel: 'বাতিল করুন',
    delete: 'মুছে ফেলুন',
    edit: 'এডিট করুন',
    search: 'খুঁজুন',
    logout: 'লগআউট',
    changeLanguage: 'ভাষা পরিবর্তন করুন',
    all: 'সব',
    customer: 'কাস্টমার',
    supplier: 'সাপ্লায়ার',
    employee: 'কর্মচারী',
    
    // Transaction types
    gave: 'দিলাম',
    received: 'পেলাম',
    cashIn: 'ক্যাশ ইন',
    cashOut: 'ক্যাশ আউট',
    
    // Khata
    yourPartyList: 'আপনার পার্টি লিস্ট',
    totalOwed: 'মোট পাবো',
    totalReceivableKhata: 'মোট দেবো',
    searchParty: 'পার্টি খুঁজুন...',
    noParty: 'কোনো পার্টি নেই',
    addCustomerSupplier: 'নতুন কাস্টমার বা সাপ্লায়ার যোগ করুন',
    addParty: 'পার্টি যোগ করুন',
    addNewParty: 'নতুন পার্টি যোগ করুন',
    name: 'নাম',
    partyName: 'পার্টির নাম লিখুন',
    willReceive: 'পাবো',
    willPay: 'দিতে হবে',
    
    // Party Detail
    partyDetail: 'পার্টি বিবরণ',
    balance: 'ব্যালেন্স',
    transactionHistory: 'লেনদেনের ইতিহাস',
    owed: 'পাবো',
    payable: 'দেবো',
    even: 'সমান',
    deletePartyConfirm: 'পার্টি মুছে ফেলবেন?',
    deletePartyDesc: 'এই পার্টি এবং সব লেনদেন মুছে যাবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।',
    
    // CashBox
    yourCash: 'আপনার নগদ হিসাব',
    currentBalance: 'বর্তমান ব্যালেন্স',
    noEntry: 'কোনো এন্ট্রি নেই',
    addCashEntry: 'ক্যাশ ইন/আউট এন্ট্রি যোগ করুন',
    addEntry: 'এন্ট্রি যোগ করুন',
    amount: 'পরিমাণ',
    category: 'ক্যাটাগরি',
    date: 'তারিখ',
    optional: 'ঐচ্ছিক',
    description: 'বিবরণ',
    writeNote: 'নোট লিখুন...',
    cashEntry: 'ক্যাশ এন্ট্রি',
    editEntry: 'এন্ট্রি এডিট করুন',
    update: 'আপডেট করুন',
    
    // Categories
    sale: 'বিক্রি',
    purchase: 'ক্রয়',
    salary: 'বেতন',
    rent: 'ভাড়া',
    transport: 'পরিবহন',
    food: 'খাবার',
    utility: 'ইউটিলিটি',
    loanGiven: 'ধার দিলাম',
    loanReceived: 'ধার পেলাম',
    investment: 'বিনিয়োগ',
    withdrawal: 'উত্তোলন',
    other: 'অন্যান্য',
    
    // Transactions
    allTransactionHistory: 'সব লেনদেনের ইতিহাস',
    totalGave: 'মোট দিলাম',
    totalReceived: 'মোট পেলাম',
    searchTransaction: 'লেনদেন খুঁজুন...',
    selectFromLedger: 'খাতা থেকে পার্টি নির্বাচন করে লেনদেন যোগ করুন',
    transaction: 'লেনদেন',
    editTransaction: 'লেনদেন এডিট করুন',
    newTransaction: 'নতুন লেনদেন',
    transactionDesc: 'লেনদেনের বিবরণ লিখুন...',
    saveGave: 'দিলাম সেভ করুন',
    saveReceived: 'পেলাম সেভ করুন',
    filterByDate: 'তারিখ দিয়ে ফিল্টার করুন',
    
    // Settings
    appManagement: 'অ্যাপ ম্যানেজমেন্ট',
    accountInfo: 'অ্যাকাউন্ট তথ্য',
    accountStatus: 'Account Status',
    activated: 'Activated ✓',
    pendingActivation: 'Pending Activation',
    dangerZone: 'ডেঞ্জার জোন',
    deleteAllData: 'সব ডেটা মুছে ফেলুন',
    deleteAllDesc: 'এটি আপনার সব পার্টি, লেনদেন এবং ক্যাশ এন্ট্রি স্থায়ীভাবে মুছে ফেলবে। এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।',
    deleteEntry: 'এন্ট্রি মুছবেন?',
    deleteEntryDesc: 'এই ক্যাশ এন্ট্রি স্থায়ীভাবে মুছে যাবে। এটি পূর্বাবস্থায় ফেরানো যাবে না।',
    verificationCode: 'ভেরিফিকেশন',
    codeSent: 'একটি কনফার্মেশন লিংক পাঠানো হয়েছে। লিংক এ ক্লিক করে কনফার্ম করুন',
    emailVerified: 'ইমেইল ভেরিফিকেশন সম্পূর্ণ হয়েছে',
    enterCode: 'কোড লিখুন',
    confirmDelete: 'নিশ্চিত করুন এবং মুছুন',
    sendingCode: 'কোড পাঠানো হচ্ছে...',
    deleting: 'মুছে ফেলা হচ্ছে...',
    noData: 'কোনো ডেটা নেই',
    resetSuccess: 'সফলভাবে রিসেট হয়েছে!',
    importantInfo: 'গুরুত্বপূর্ণ তথ্য',
    backupWarning: 'রিসেট করার আগে নিশ্চিত হন যে আপনার প্রয়োজনীয় ডেটা ব্যাকআপ করে রাখা আছে। রিসেট বাটনে ক্লিক করলে আপনার ইমেইলে একটি কনফার্মেশন লিংক পাঠানো হবে।',
    
    // Complete Profile
    completeProfile: 'প্রোফাইল সম্পূর্ণ করুন',
    startWithInfo: 'আপনার তথ্য দিয়ে শুরু করুন',
    username: 'ইউজারনেম',
    enterUsername: 'আপনার ইউজারনেম লিখুন',
    mobileNumber: 'মোবাইল নম্বর',
    next: 'পরবর্তী',
    saving: 'সংরক্ষণ করা হচ্ছে...',
    fillAllInfo: 'সব তথ্য পূরণ করুন',
    activationInfo: 'এই তথ্য দেওয়ার পর আপনাকে একটি অ্যাক্টিভেশন কোড দেওয়া হবে। এডমিনের কাছ থেকে কোড পেয়ে অ্যাকাউন্ট অ্যাক্টিভেট করুন।',
    
    // Activation
    accountActivation: 'অ্যাকাউন্ট অ্যাক্টিভেশন',
    activationRequired: 'আপনার অ্যাকাউন্ট ব্যবহার করতে অ্যাক্টিভেশন প্রয়োজন',
    getActivationCode: 'অ্যাক্টিভেশন কোড পেতে:',
    contactAdminWhatsApp: 'এডমিনের সাথে WhatsApp-এ যোগাযোগ করুন',
    contactAdmin: 'এডমিনের সাথে যোগাযোগ করুন',
    enterActivationCode: 'অ্যাক্টিভেশন কোড লিখুন',
    activationCodePlaceholder: 'আপনার কোড এখানে লিখুন',
    verifying: 'যাচাই করা হচ্ছে...',
    activate: 'অ্যাক্টিভেট করুন',
    activationNote: 'একবার অ্যাক্টিভেট হলে আর কোনো অ্যাক্টিভেশন লাগবে না',
    enterActivationCodeError: 'অ্যাক্টিভেশন কোড লিখুন',
    invalidActivationCode: 'ভুল অ্যাক্টিভেশন কোড! অনুগ্রহ করে সঠিক কোড লিখুন।',
    activationError: 'একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।',
  },
  en: {
    // Navigation
    home: 'Home',
    khata: 'Due Ledger',
    cashbox: 'Cash Box',
    transactions: 'Transactions',
    settings: 'Settings',
    
    // Dashboard
    dashboard: 'Dashboard',
    businessSummary: 'Your Business Summary',
    totalReceivable: 'Total Receivable',
    totalPayable: 'Total Payable',
    cashBalance: 'Cash Balance',
    totalParties: 'Total Parties',
    weeklyIncomeExpense: 'Weekly Income & Expense',
    recentTransactions: 'Recent Transactions',
    viewAll: 'View All',
    noTransactions: 'No transactions',
    
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    logout: 'Logout',
    changeLanguage: 'Change Language',
    all: 'All',
    customer: 'Customer',
    supplier: 'Supplier',
    employee: 'Employee',
    
    // Transaction types
    gave: 'Gave',
    received: 'Received',
    cashIn: 'Cash In',
    cashOut: 'Cash Out',
    
    // Khata
    yourPartyList: 'Your Party List',
    totalOwed: 'Total Receivable',
    totalReceivableKhata: 'Total Payable',
    searchParty: 'Search party...',
    noParty: 'No party',
    addCustomerSupplier: 'Add new customer or supplier',
    addParty: 'Add Party',
    addNewParty: 'Add New Party',
    name: 'Name',
    partyName: 'Enter party name',
    willReceive: 'Will Receive',
    willPay: 'Will Pay',
    
    // Party Detail
    partyDetail: 'Party Detail',
    balance: 'Balance',
    transactionHistory: 'Transaction History',
    owed: 'Owed',
    payable: 'Payable',
    even: 'Even',
    deletePartyConfirm: 'Delete Party?',
    deletePartyDesc: 'This party and all transactions will be deleted. This action cannot be undone.',
    
    // CashBox
    yourCash: 'Your Cash Account',
    currentBalance: 'Current Balance',
    noEntry: 'No entry',
    addCashEntry: 'Add Cash In/Out Entry',
    addEntry: 'Add Entry',
    amount: 'Amount',
    category: 'Category',
    date: 'Date',
    optional: 'Optional',
    description: 'Description',
    writeNote: 'Write note...',
    cashEntry: 'Cash Entry',
    editEntry: 'Edit Entry',
    update: 'Update',
    
    // Categories
    sale: 'Sale',
    purchase: 'Purchase',
    salary: 'Salary',
    rent: 'Rent',
    transport: 'Transport',
    food: 'Food',
    utility: 'Utility',
    loanGiven: 'Loan Given',
    loanReceived: 'Loan Received',
    investment: 'Investment',
    withdrawal: 'Withdrawal',
    other: 'Other',
    
    // Transactions
    allTransactionHistory: 'All Transaction History',
    totalGave: 'Total Gave',
    totalReceived: 'Total Received',
    searchTransaction: 'Search transaction...',
    selectFromLedger: 'Select party from ledger to add transaction',
    transaction: 'Transaction',
    editTransaction: 'Edit Transaction',
    newTransaction: 'New Transaction',
    transactionDesc: 'Transaction description...',
    saveGave: 'Save Gave',
    saveReceived: 'Save Received',
    filterByDate: 'Filter by Date',
    
    // Settings
    appManagement: 'App Management',
    accountInfo: 'Account Information',
    accountStatus: 'Account Status',
    activated: 'Activated ✓',
    pendingActivation: 'Pending Activation',
    dangerZone: 'Danger Zone',
    deleteAllData: 'Delete All Data',
    deleteAllDesc: 'This will permanently delete all your parties, transactions and cash entries. This action cannot be undone.',
    deleteEntry: 'Delete Entry?',
    deleteEntryDesc: 'This cash entry will be permanently deleted. This action cannot be undone.',
    verificationCode: 'Verification',
    codeSent: 'A confirmation link has been sent. Click the link to confirm',
    emailVerified: 'Email verification completed',
    enterCode: 'Enter code',
    confirmDelete: 'Confirm and Delete',
    sendingCode: 'Sending code...',
    deleting: 'Deleting...',
    noData: 'No data',
    resetSuccess: 'Successfully reset!',
    importantInfo: 'Important Information',
    backupWarning: 'Make sure your necessary data is backed up before resetting. Clicking the reset button will send a confirmation link to your email.',
    
    // Complete Profile
    completeProfile: 'Complete Profile',
    startWithInfo: 'Start with your information',
    username: 'Username',
    enterUsername: 'Enter your username',
    mobileNumber: 'Mobile Number',
    next: 'Next',
    saving: 'Saving...',
    fillAllInfo: 'Fill all information',
    activationInfo: 'After providing this information, you will be given an activation code. Activate your account by getting the code from admin.',
    
    // Activation
    accountActivation: 'Account Activation',
    activationRequired: 'Your account needs to be activated to use it',
    getActivationCode: 'To get activation code:',
    contactAdminWhatsApp: 'Contact admin on WhatsApp',
    contactAdmin: 'Contact Admin',
    enterActivationCode: 'Enter Activation Code',
    activationCodePlaceholder: 'Enter your code here',
    verifying: 'Verifying...',
    activate: 'Activate',
    activationNote: 'Once activated, no further activation will be required',
    enterActivationCodeError: 'Enter activation code',
    invalidActivationCode: 'Invalid activation code! Please enter the correct code.',
    activationError: 'An error occurred. Please try again.',
  }
};

export function LanguageProvider({ children }) {
  const { user } = useAuth();
  // Load instantly from localStorage so the UI never waits for the network
  const [language, setLanguage] = useState(() => getStoredLanguage() || 'bn');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadLanguage = async () => {
      // The device preference is authoritative. This prevents an older server
      // value from reverting the language after navigating to another page.
      const storedLanguage = getStoredLanguage();
      if (storedLanguage) {
        setLanguage(storedLanguage);
        setIsLoading(false);
        return;
      }

      if (user) {
        try {
          const userData = await base44.auth.me();
          const serverLang = userData.language;
          const latestStoredLanguage = getStoredLanguage();
          if (!active) return;
          if (latestStoredLanguage) {
            setLanguage(latestStoredLanguage);
          } else if (isSupportedLanguage(serverLang)) {
            setLanguage(serverLang);
            try { localStorage.setItem(LANGUAGE_STORAGE_KEY, serverLang); } catch {}
          }
        } catch (error) {
          console.error('Error loading language:', error);
        }
      }
      if (active) setIsLoading(false);
    };
    loadLanguage();
    return () => {
      active = false;
    };
  }, [user]);

  const changeLanguage = (newLang) => {
    if (!isSupportedLanguage(newLang)) return;
    const apply = () => {
      setLanguage(newLang);
      try { localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang); } catch {}
    };
    // Swap every label at once inside a view transition so the page crossfades
    // smoothly instead of visibly re-laying out (the "shake" users noticed).
    if (typeof document !== 'undefined' && document.startViewTransition) {
      document.startViewTransition(() => {
        flushSync(apply);
      });
    } else {
      apply();
    }
    // Persist to server in the background (fire-and-forget)
    if (user) {
      base44.auth.updateMe({ language: newLang }).catch((error) => {
        console.error('Error updating language:', error);
      });
    }
  };

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, isLoading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};