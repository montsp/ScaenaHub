import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="h-screen bg-secondary-50 overflow-hidden">
      {children}
    </div>
  );
};

export default Layout;