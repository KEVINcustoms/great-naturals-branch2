import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "./LoginForm";
import { SignUpForm } from "./SignUpForm";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap, Shield, BarChart3, Star, Mail, Phone, MapPin, Clock, Github, Linkedin, Twitter } from "lucide-react";

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
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">G</span>
                </div>
                <span className="text-2xl font-bold text-gray-800">Groom Stream</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
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

        {/* Right Column - Promotional Content */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-12 items-center justify-center">
          <div className="max-w-lg space-y-8">
            {/* Branding */}
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">G</span>
              </div>
              <span className="text-2xl font-bold text-white">Groom Stream</span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-white leading-tight">
                The future of{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  salon management
                </span>
              </h2>
              <p className="text-lg text-gray-300 leading-relaxed">
                Join thousands of salons using AI-powered tools to streamline operations, reduce costs, and deliver exceptional customer care.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid gap-4">
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Smart Inventory</h3>
                      <p className="text-sm text-gray-400">Real-time tracking with expiry alerts</p>
                    </div>
                  </div>
                  <div className="text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Lightning Fast</h3>
                      <p className="text-sm text-gray-400">Process appointments in under 30 seconds</p>
                    </div>
                  </div>
                  <div className="text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Secure & Compliant</h3>
                      <p className="text-sm text-gray-400">GDPR compliant with role-based access</p>
                    </div>
                  </div>
                  <div className="text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">Powerful Analytics</h3>
                      <p className="text-sm text-gray-400">Insights that drive profitability</p>
                    </div>
                  </div>
                  <div className="text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-gray-400 text-sm">Trusted by 1000+ salons</span>
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
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">G</span>
                </div>
                <span className="text-xl font-bold">Groom Stream</span>
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