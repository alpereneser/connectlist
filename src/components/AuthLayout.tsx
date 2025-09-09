import React from 'react';
import { Link } from 'react-router-dom';


interface AuthLayoutProps {
  children: React.ReactNode;
  image?: string;
}

export function AuthLayout({ children, image }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex md:flex-row flex-col">
      <div className="flex-1 flex items-center justify-center p-8 md:p-8 p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Link to="/" className="inline-block">
              <img src="https://ynbwiarxodetyirhmcbp.supabase.co/storage/v1/object/public/images/connectlist-beta-logo.png?t=1" alt="Connectlist" className="md:w-[215px] md:h-[25px] w-[161px] h-[19px] mx-auto" />
            </Link>
          </div>
          {children}
        </div>

      </div>
      <div className="hidden md:block md:w-1/2 relative">
        <img
          src={image || "https://ynbwiarxodetyirhmcbp.supabase.co/storage/v1/object/public/images//intro_gorsel.jpg"}
          alt="Auth background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex items-center justify-center text-white p-12">
          <div className="max-w-xl">
            <h2 className="text-4xl font-bold mb-6">Socialize With Lists,</h2>
            <h2 className="text-4xl font-bold mb-6">Get Information,</h2>
            <h2 className="text-4xl font-bold">Socializing.</h2>
          </div>
        </div>
      </div>
    </div>
  );
}