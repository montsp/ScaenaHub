import React from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { getUserColor } from '../utils';

interface UserAvatarProps {
  userId: string;
  displayName: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  userId, 
  displayName, 
  size = 'md',
  showName = false
}) => {
  const { showProfile } = useProfile();
  const userColor = getUserColor(userId);
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };
  
  return (
    <div className="flex items-center">
      <div 
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-medium ${userColor} cursor-pointer hover:opacity-90 transition-opacity`}
        onClick={() => showProfile(userId)}
        title={displayName}
      >
        {displayName.charAt(0).toUpperCase()}
      </div>
      
      {showName && (
        <span 
          className="ml-2 font-medium text-secondary-900 cursor-pointer hover:underline"
          onClick={() => showProfile(userId)}
        >
          {displayName}
        </span>
      )}
    </div>
  );
};

export default UserAvatar;