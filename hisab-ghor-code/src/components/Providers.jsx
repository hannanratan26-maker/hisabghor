import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { ThemeProvider } from './ThemeContext';
import { LanguageProvider } from './LanguageContext';
import { AuthProvider } from '@/lib/AuthContext';
import { Toaster } from 'sonner';

export default function ProvidersWrapper({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <QueryClientProvider client={queryClientInstance}>
            {children}
            <Toaster position="top-center" richColors />
          </QueryClientProvider>
        </LanguageProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}