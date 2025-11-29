import React, { useState, useEffect } from 'react';
import { Shield, GraduationCap, Users, Calendar, Clock, CheckCircle, ArrowRight, Heart, BookOpen, Award, ChevronDown, Menu, X, UserPlus, Lock } from 'lucide-react';

const LandingPage = ({ onGetStarted }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) {
      setSubscriptionStatus('error');
      setSubscriptionMessage('Please enter a valid email address');
      return;
    }

    setIsSubscribing(true);
    setSubscriptionMessage('');
    setSubscriptionStatus('');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `Process a subscription request for the Kumadronas ISCC Duty System for email: ${email}. Generate a unique subscription ID and return a JSON response with: {"success": true, "message": "Successfully subscribed! You now have access to the Kumadronas System.", "subscriptionId": "SUB-" + random 8 character alphanumeric, "accessGranted": true}`
            }
          ],
        }),
      });

      const data = await response.json();
      const responseText = data.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('');

      const cleanResponse = responseText.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleanResponse);

      if (result.success && result.accessGranted) {
        setSubscriptionStatus('success');
        setSubscriptionMessage(result.message || 'Successfully subscribed! Redirecting to dashboard...');
        setEmail('');
        
        setTimeout(() => {
          if (onGetStarted) {
            onGetStarted();
          }
        }, 2000);
      } else {
        setSubscriptionStatus('error');
        setSubscriptionMessage(result.message || 'Subscription failed. Please try again.');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setSubscriptionStatus('error');
      setSubscriptionMessage('An error occurred. Please try again later.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubscribe();
    }
  };

  const features = [
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Effortlessly manage your on-call duty schedules with our intelligent booking system.",
      color: "from-emerald-500 to-green-600"
    },
    {
      icon: Clock,
      title: "Real-time Updates",
      description: "Get instant notifications about schedule changes and important announcements.",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: Shield,
      title: "Secure & Reliable",
      description: "Your data is protected with enterprise-grade security and reliable cloud infrastructure.",
      color: "from-emerald-500 to-green-600"
    }
  ];

  const howItWorksSteps = [
    {
      step: "01",
      title: "Subscribe with Email",
      description: "Enter your email to subscribe and unlock instant access to the Kumadronas System. It's free for all ISCC students.",
      icon: UserPlus,
      color: "from-emerald-500 to-green-600"
    },
    {
      step: "02",
      title: "Access Your Dashboard",
      description: "Once subscribed, you'll gain immediate access to browse schedules, book duty slots, and manage your profile.",
      icon: Calendar,
      color: "from-emerald-500 to-green-600"
    },
    {
      step: "03",
      title: "Track Your Journey",
      description: "Monitor your clinical hours, receive notifications, and stay on track with your midwifery program requirements.",
      icon: Award,
      color: "from-green-500 to-emerald-600"
    }
  ];

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                <Heart className="w-7 h-7 text-white" fill="white" />
              </div>
              <div>
                <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  Kumadronas
                </div>
                <div className="text-xs text-gray-600 -mt-1">ISCC Duty System</div>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-gray-700 hover:text-emerald-600 transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-gray-700 hover:text-emerald-600 transition-colors"
              >
                How it Works
              </button>
              <button
                onClick={() => scrollToSection('subscribe')}
                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-2 rounded-full hover:shadow-lg transition-all duration-200 flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Subscribe to Access
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 space-y-4">
              <button
                onClick={() => scrollToSection('features')}
                className="block text-gray-700 hover:text-emerald-600"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="block text-gray-700 hover:text-emerald-600"
              >
                How it Works
              </button>
              <button
                onClick={() => scrollToSection('subscribe')}
                className="block w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-2 rounded-full"
              >
                Subscribe to Access
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 relative z-10">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold">
                <GraduationCap className="w-4 h-4" />
                <span>For ISCC Midwifery Students</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  Streamline
                </span>
                <br />
                Your Midwifery Journey
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                The complete duty scheduling system for ISCC midwifery students. 
                Manage schedules, track progress, and stay connected with your academic journey.
              </p>

              {/* Hero Subscription Form */}
              <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-emerald-200">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Subscribe to Unlock Access</h3>
                </div>
                <div className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your ISCC email address"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                    disabled={isSubscribing}
                  />
                  <button
                    onClick={handleSubscribe}
                    disabled={isSubscribing}
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubscribing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        Subscribe & Get Access
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                  
                  {subscriptionMessage && (
                    <div className={`p-3 rounded-lg ${
                      subscriptionStatus === 'success' 
                        ? 'bg-green-50 text-green-800 border border-green-200' 
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      <div className="flex items-center gap-2 text-sm">
                        {subscriptionStatus === 'success' ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        <span>{subscriptionMessage}</span>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Free for all ISCC students • No credit card required
                </p>
              </div>

              <div className="flex items-center gap-8 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  <span>Secure & Private</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <span>Instant Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span>Easy to Use</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-3xl shadow-2xl p-8 relative overflow-hidden">
                {/* Locked Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl">
                      <Lock className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-lg font-semibold text-gray-800 mb-2">Subscribe to Unlock</p>
                    <p className="text-sm text-gray-600">Full dashboard access</p>
                  </div>
                </div>

                <div className="text-sm text-gray-500 mb-2">Kumadronas Dashboard</div>
                <div className="text-2xl font-bold text-gray-800 mb-6">Welcome, Student!</div>
                
                <div className="space-y-6 opacity-50">
                  <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-2xl border border-emerald-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm text-gray-600">Next Duty</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-800">Monday, 6:00 AM - Labor Ward</div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-gray-600">Clinical Hours</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-800">384 / 480 hours</div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Award className="w-5 h-5 text-purple-600" />
                      <span className="text-sm text-gray-600">Completion</span>
                    </div>
                    <div className="text-lg font-semibold text-gray-800">80% Complete</div>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full opacity-20 blur-2xl animate-pulse"></div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-br from-green-400 to-teal-500 rounded-full opacity-20 blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-8 h-8 text-emerald-600" />
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features designed specifically for midwifery students and educators
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`relative p-8 rounded-2xl cursor-pointer transition-all duration-300 ${
                    activeFeature === index
                      ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-2xl scale-105'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                    activeFeature === index
                      ? 'bg-white/20'
                      : 'bg-gradient-to-br ' + feature.color
                  }`}>
                    <Icon className={`w-8 h-8 ${activeFeature === index ? 'text-white' : 'text-white'}`} />
                  </div>
                  <h3 className={`text-2xl font-bold mb-4 ${
                    activeFeature === index ? 'text-white' : 'text-gray-800'
                  }`}>
                    {feature.title}
                  </h3>
                  <p className={activeFeature === index ? 'text-emerald-50' : 'text-gray-600'}>
                    {feature.description}
                  </p>
                  {activeFeature === index && (
                    <div className="absolute bottom-4 right-4">
                      <ArrowRight className="w-6 h-6 text-white animate-pulse" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-20 bg-gradient-to-br from-emerald-600 to-green-600 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">250+</div>
              <div className="text-emerald-100">Active Students</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">15K+</div>
              <div className="text-emerald-100">Clinical Hours Logged</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">92%</div>
              <div className="text-emerald-100">Licensure Pass Rate</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">99.9%</div>
              <div className="text-emerald-100">System Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works Section */}
      <div id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
              How it Works
            </h2>
            <p className="text-xl text-gray-600">
              Get started with the Kumadronas System in just three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {howItWorksSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  {/* Connection Line */}
                  {index < howItWorksSteps.length - 1 && (
                    <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-emerald-300 to-green-300 z-0"></div>
                  )}

                  <div className="relative z-10 bg-white">
                    {/* Step Number */}
                    <div className={`w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-2xl`}>
                      <Icon className="w-16 h-16 text-white" />
                    </div>

                    <div className="text-center">
                      <div className="text-emerald-600 font-bold text-lg mb-2">{step.step}</div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-4">{step.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Additional Features Grid */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <Clock className="w-12 h-12 text-emerald-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Real-time Updates</h3>
              <p className="text-gray-600 text-sm">Get instant notifications about schedule changes</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <Shield className="w-12 h-12 text-emerald-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Secure Access</h3>
              <p className="text-gray-600 text-sm">Your data is protected with enterprise security</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <Users className="w-12 h-12 text-emerald-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Multi-Role Support</h3>
              <p className="text-gray-600 text-sm">Students, parents, and administrators all connected</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <Award className="w-12 h-12 text-emerald-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-800 mb-2">Progress Tracking</h3>
              <p className="text-gray-600 text-sm">Monitor your journey and achievements</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscribe CTA Section */}
      <div id="subscribe" className="py-20 bg-gradient-to-br from-emerald-500 to-green-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Subscribe to Unlock Full Access
          </h2>
          <p className="text-xl mb-8 text-emerald-50">
            Join hundreds of ISCC students already using the Kumadronas System to excel in their studies.
          </p>
          
          {/* Main Subscription Form */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl border-2 border-white/20">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your ISCC email address"
                  className="flex-1 px-6 py-4 rounded-xl text-gray-800 text-lg focus:outline-none focus:ring-4 focus:ring-white/30"
                  disabled={isSubscribing}
                />
                <button
                  onClick={handleSubscribe}
                  disabled={isSubscribing}
                  className="bg-white text-emerald-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-50 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubscribing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Subscribe Now
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
              
              {subscriptionMessage && (
                <div className={`mt-4 p-4 rounded-xl ${
                  subscriptionStatus === 'success' 
                    ? 'bg-green-500/20 text-white border border-green-300/30' 
                    : 'bg-red-500/20 text-white border border-red-300/30'
                }`}>
                  <div className="flex items-center gap-2">
                    {subscriptionStatus === 'success' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <X className="w-5 h-5" />
                    )}
                    <span>{subscriptionMessage}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-emerald-50">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>Free for ISCC students</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>Instant Access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" fill="white" />
                </div>
                <div className="text-xl font-bold text-white">Kumadronas System</div>
              </div>
              <p className="text-sm text-gray-400">Empowering ISCC midwifery students with smart scheduling solutions</p>
            </div>
            <div className="text-sm text-gray-400">
              © 2025 Ilocos Sur Community College. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
