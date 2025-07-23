import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProfileContextType {
  selectedUserId: string | null;
  showProfile: (userId: string) => void;
  hideProfile: () => void;
  isProfileVisible: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileVisible, setIsProfileVisible] = useState(false);

  const showProfile = (userId: string) => {
    setSelectedUserId(userId);
    setIsProfileVisible(true);
  };

  const hideProfile = () => {
    setIsProfileVisible(false);
    // We don't clear the userId immediately to avoid UI flicker during close animation
    setTimeout(() => setSelectedUserId(null), 300);
  };

  return (
    <ProfileContext.Provider
      value={{
        selectedUserId,
        showProfile,
        hideProfile,
        isProfileVisible
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};