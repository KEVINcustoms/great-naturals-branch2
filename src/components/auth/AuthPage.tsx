import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "./LoginForm";
import { SignUpForm } from "./SignUpForm";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap, Shield, Star, Mail, Phone, MapPin } from "lucide-react";
import greatNaturalsLogo from "@/assets/great-naturals-logo.png";
import hairShowcase from "@/assets/hair_shocase.jpg";
import salonProducts from "@/assets/saloon_products.jpg";
import rightColumnBg from "@/assets/right_column_bg.jpg";
import saloon_award from "@/assets/saloon_award.jpg";

export function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Column - Authentication */}
        <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-md space-y-6">
            {/* Branding */}
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center space-x-3">
                <img 
                  src={greatNaturalsLogo} 
                  alt="Great Naturals" 
                  className="w-20 h-20 object-contain"
                />
                <span className="text-3xl font-bold text-gray-800">Great Naturals</span>
              </div>
              <h1 style={{ color: '#859447' }} className="text-4xl font-bold">Welcome back</h1>
              <p className="text-lg text-gray-600">Sign in to your salon management dashboard</p>
            </div>

            {/* Account Access Section */}
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900">Access Your Account</h2>
                <p className="text-base text-gray-500">Choose your preferred method to continue</p>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger 
                    value="login" 
                    className={`rounded-md transition-all ${
                      activeTab === "login" 
                        ? "bg-white text-gray-900 shadow-sm" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger 
                    value="signup" 
                    className={`rounded-md transition-all ${
                      activeTab === "signup" 
                        ? "bg-white text-gray-900 shadow-sm" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="mt-6">
                  <LoginForm />
                </TabsContent>
                <TabsContent value="signup" className="mt-6">
                  <SignUpForm />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Right Column - Salon Showcase */}
        <div className="hidden lg:flex lg:w-1/2 p-8 lg:p-12 items-center justify-center relative overflow-hidden">
          {/* Background Image with Professional Fade */}
          <div className="absolute inset-0">
            <img 
              src={rightColumnBg} 
              alt="Salon Background" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-gray-800/80 to-gray-900/85"></div>
          </div>
          
          <div className="relative z-10 w-full max-w-2xl space-y-8">
            {/* Branding */}
            <div className="flex items-center justify-center space-x-3 mb-8">
              <img 
                src={greatNaturalsLogo} 
                alt="Great Naturals" 
                className="w-24 h-24 object-contain"
              />
              <span className="text-4xl font-bold text-white">Great Naturals</span>
            </div>

            {/* Headline */}
            <div className="text-center space-y-6 mb-8">
              <h2 className="text-5xl font-bold text-white leading-tight">
                The future of{" "}
                <span style={{ color: '#859447' }}>
                  salon management
                </span>
              </h2>
              <p className="text-xl text-gray-300 leading-relaxed max-w-lg mx-auto">
                Join thousands of salons using AI-powered tools to streamline operations, reduce costs, and deliver exceptional customer care.
              </p>
            </div>

            {/* Salon Showcase Gallery - Now 3 cards including the award */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {/* Hair Showcase */}
              <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-2xl p-6 border border-blue-500/30 backdrop-blur-sm">
                <div className="w-full h-40 rounded-xl mb-4 overflow-hidden">
                  <img 
                    src={hairShowcase} 
                    alt="Professional Hair Styling" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-white font-semibold text-center text-lg">Professional Hair Styling</h3>
                <p className="text-blue-200 text-sm text-center">Expert techniques & stunning results</p>
              </div>

              {/* Salon Products */}
              <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl p-6 border border-purple-500/30 backdrop-blur-sm">
                <div className="w-full h-40 rounded-xl mb-4 overflow-hidden">
                  <img 
                    src={salonProducts} 
                    alt="Premium Salon Products" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-white font-semibold text-center text-lg">Premium Products</h3>
                <p className="text-purple-200 text-sm text-center">High-quality beauty essentials</p>
              </div>

              {/* Salon Award */}
              <div className="bg-gradient-to-br from-amber-600/20 to-orange-600/20 rounded-2xl p-6 border border-amber-500/30 backdrop-blur-sm">
                <div className="w-full h-40 rounded-xl mb-4 overflow-hidden">
                  <img 
                    src={saloon_award} 
                    alt="Salon Excellence Award" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-white font-semibold text-center text-lg">Excellence Award</h3>
                <p className="text-amber-200 text-sm text-center">Recognized for outstanding service</p>
              </div>
            </div>

            {/* Feature Highlights - Streamlined */}
            <div className="grid gap-4 mb-6">
              <div className="flex items-center space-x-3 text-white">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <span className="text-base">Smart inventory management with real-time tracking</span>
              </div>
              <div className="flex items-center space-x-3 text-white">
                <Zap className="w-6 h-6 text-yellow-400" />
                <span className="text-base">Lightning-fast appointment processing</span>
              </div>
              <div className="flex items-center space-x-3 text-white">
                <Shield className="w-6 h-6 text-blue-400" />
                <span className="text-base">Secure & GDPR compliant platform</span>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center justify-center space-x-3">
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-7 h-7 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-gray-300 text-base font-medium">Trusted by 1000+ salons</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Company Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <img 
                  src={greatNaturalsLogo} 
                  alt="Great Naturals" 
                  className="w-12 h-12 object-contain"
                />
                <span className="text-lg font-bold">Great Naturals</span>
              </div>
              <p className="text-gray-400 text-sm">
                The future of salon management. Streamline operations, reduce costs, and deliver exceptional customer care.
              </p>
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-base">Contact</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400">kevincustoms1"gmail.com</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400">+1 (256) 754-815-153</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400">Kampala Central Region, UG</span>
                </div>
              </div>
            </div>

            {/* Company Details */}
            <div className="space-y-3">
              <h3 className="font-semibold text-base">Company</h3>
              <div className="space-y-2 text-sm">
                <div className="text-gray-400">
                  <p className="font-medium text-white">KEVINcustoms</p>
                  <p>Leading software solutions</p>
                </div>
                <div className="text-gray-400">
                  <p className="font-medium text-white">In collaboration with</p>
                  <p>Devzora Technologies</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-6 pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 KEVINcustoms. All rights reserved.
            </p>
            <div className="flex space-x-4 mt-2 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}