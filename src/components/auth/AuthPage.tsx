import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "./LoginForm";
import { SignUpForm } from "./SignUpForm";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap, Shield, BarChart3, Star, Mail, Phone, MapPin, Clock, Github, Linkedin, Twitter } from "lucide-react";
import greatNaturalsLogo from "@/assets/great-naturals-logo.png";
import hairShowcase from "@/assets/hair_shocase.jpg";
import salonProducts from "@/assets/saloon_products.jpg";
import salonAward from "@/assets/saloon_award.jpg";
import customerReview from "@/assets/customer_review_image.jpg";
import rightColumnBg from "@/assets/right_column_bg.jpg";

export function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Column - Authentication */}
        <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-8">
            {/* Branding */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2">
                                 <img 
                   src={greatNaturalsLogo} 
                   alt="Great Naturals" 
                   className="w-16 h-16 object-contain"
                 />
                                 <span className="text-2xl font-bold text-gray-800">Great Naturals</span>
              </div>
                             <h1 style={{ color: '#859447' }} className="text-3xl font-bold">Welcome back</h1>
              <p className="text-gray-600">Sign in to your salon management dashboard</p>
            </div>

            {/* Account Access Section */}
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900">Access Your Account</h2>
                <p className="text-sm text-gray-500">Choose your preferred method to continue</p>
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
         <div className="hidden lg:flex lg:w-1/2 p-8 items-center justify-center relative overflow-hidden">
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
            <div className="flex items-center justify-center space-x-2 mb-8">
                             <img 
                 src={greatNaturalsLogo} 
                 alt="Great Naturals" 
                 className="w-20 h-20 object-contain"
               />
                             <span className="text-3xl font-bold text-white">Great Naturals</span>
            </div>

            {/* Headline */}
            <div className="text-center space-y-4 mb-8">
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

            {/* Salon Showcase Gallery */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                             {/* Hair Showcase */}
               <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-2xl p-6 border border-blue-500/30 backdrop-blur-sm">
                 <div className="w-full h-32 rounded-xl mb-4 overflow-hidden">
                   <img 
                     src={hairShowcase} 
                     alt="Professional Hair Styling" 
                     className="w-full h-full object-cover"
                   />
                 </div>
                 <h3 className="text-white font-semibold text-center">Professional Hair Styling</h3>
                 <p className="text-blue-200 text-sm text-center">Expert techniques & stunning results</p>
               </div>

                             {/* Salon Products */}
               <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl p-6 border border-purple-500/30 backdrop-blur-sm">
                 <div className="w-full h-32 rounded-xl mb-4 overflow-hidden">
                   <img 
                     src={salonProducts} 
                     alt="Premium Salon Products" 
                     className="w-full h-full object-cover"
                   />
                 </div>
                 <h3 className="text-white font-semibold text-center">Premium Products</h3>
                 <p className="text-purple-200 text-sm text-center">High-quality beauty essentials</p>
               </div>

                             {/* Customer Experience */}
               <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-2xl p-6 border border-green-500/30 backdrop-blur-sm">
                 <div className="w-full h-35 rounded-xl mb-4 overflow-hidden">
                   <img 
                     src={customerReview} 
                     alt="Customer Satisfaction" 
                     className="w-full h-full object-cover"
                   />
                 </div>
                 <h3 className="text-white font-semibold text-center">Customer Experience</h3>
                 <p className="text-green-200 text-sm text-center">Exceptional service delivery</p>
               </div>

                             {/* Salon Excellence */}
               <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 rounded-2xl p-6 border border-orange-500/30 backdrop-blur-sm">
                 <div className="w-full h-35 rounded-xl mb-4 overflow-hidden">
                   <img 
                     src={salonAward} 
                     alt="Salon Excellence" 
                     className="w-full h-full object-cover object-top -mt-8"
                   />
                 </div>
                 <h3 className="text-white font-semibold text-center">Salon Excellence</h3>
                 <p className="text-orange-200 text-sm text-center">Award-winning service quality</p>
               </div>
            </div>

            {/* Feature Highlights */}
            <div className="grid gap-3 mb-6">
              <div className="flex items-center space-x-3 text-white">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-sm">Smart inventory management with real-time tracking</span>
              </div>
              <div className="flex items-center space-x-3 text-white">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="text-sm">Lightning-fast appointment processing</span>
              </div>
              <div className="flex items-center space-x-3 text-white">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="text-sm">Secure & GDPR compliant platform</span>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center justify-center space-x-2">
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-gray-300 text-sm font-medium">Trusted by 1000+ salons</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {/* Company Info */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center space-x-2">
                                 <img 
                   src={greatNaturalsLogo} 
                   alt="Great Naturals" 
                   className="w-14 h-14 object-contain"
                 />
                                 <span className="text-xl font-bold">Great Naturals</span>
              </div>
              <p className="text-gray-400 max-w-md">
                The future of salon management. Streamline operations, reduce costs, and deliver exceptional customer care with our AI-powered platform.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Contact</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-400">info@devzoratech.com</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-400">+1 (256) 755-543-250</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-400">Kampala Central Region, UG</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-400">Mon - Fri: 9AM - 6PM PST</span>
                </div>
              </div>
            </div>

            {/* Company Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Company</h3>
              <div className="space-y-3">
                <div className="text-gray-400">
                  <p className="font-medium text-white">Devzora Technologies</p>
                  <p className="text-sm">Leading software solutions</p>
                </div>
                <div className="text-gray-400">
                  <p className="font-medium text-white">In collaboration with</p>
                  <p className="text-sm">NEXATEK</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 Devzora Technologies. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}