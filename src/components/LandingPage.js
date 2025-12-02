import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  GraduationCap, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle,
  ArrowRight,
  Heart,
  BookOpen,
  Award,
  ChevronDown,
  Menu,
  X,
  UserPlus
} from 'lucide-react';

const LandingPage = ({ onGetStarted }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      title: "Create Your Account",
      description: "Register with your ISCC credentials as a student, parent, or administrator. Your profile is automatically set up with your program information.",
      icon: UserPlus,
      color: "from-emerald-500 to-green-600"
    },
    {
      step: "02", 
      title: "View & Book Schedules",
      description: "Browse available duty slots, view your upcoming schedules, and book new sessions that fit your availability and requirements.",
      icon: Calendar,
      color: "from-emerald-500 to-green-600"
    },
    {
      step: "03",
      title: "Track Your Progress",
      description: "Monitor your completed hours, view duty history, receive notifications, and stay on track with your midwifery program requirements.",
      icon: Award,
      color: "from-green-500 to-emerald-600"
    }
  ];

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
                <img 
                  src="/image0.png" 
                  alt="ISCC Midwifery Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="font-bold text-xl bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  Kumadronas
                </span>
                <p className="text-xs text-gray-500 hidden sm:block">ISCC Duty System</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
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
                onClick={() => scrollToSection('about')}
                className="text-gray-700 hover:text-emerald-600 transition-colors"
              >
                About
              </button>
              <button
                onClick={onGetStarted}
                className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-2 rounded-full hover:shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                Get Started
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
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t shadow-lg">
            <div className="px-4 py-4 space-y-4">
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
                onClick={() => scrollToSection('about')}
                className="block text-gray-700 hover:text-emerald-600"
              >
                About
              </button>
              <button
                onClick={onGetStarted}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-full"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-16 bg-gradient-to-br from-emerald-50 via-green-50 to-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-slate-600 bg-clip-text text-transparent">
                  Streamline Your
                </span>
                <br />
                <span className="text-gray-900">Midwifery Journey</span>
              </h1>
              
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                The complete duty scheduling system for ISCC midwifery students. 
                Manage schedules, track progress, and stay connected with your academic journey.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button
                  onClick={onGetStarted}
                  className="group bg-gradient-to-r from-emerald-600 to-green-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center"
                >
                  Start Your Journey
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => scrollToSection('features')}
                  className="border-2 border-emerald-600 text-emerald-600 px-8 py-4 rounded-full font-semibold text-lg hover:bg-emerald-600 hover:text-white transition-all duration-200"
                >
                  Learn More
                </button>
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  Secure & Private
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  Real-time Updates
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  Easy to Use
                </div>
              </div>
            </div>

            <div className="relative animate-fade-in-up delay-200">
              <div className="relative bg-white rounded-2xl shadow-2xl p-8 transform hover:rotate-1 transition-transform duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-sm text-gray-500">Kumadronas Dashboard</span>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg">
                    <Calendar className="w-8 h-8 text-emerald-600 mr-3" />
                    <div>
                      <p className="font-semibold text-gray-800">Next Duty</p>
                      <p className="text-sm text-gray-600">Monday, 6:00 AM - Labor Ward</p>
                    </div>
                  </div>
                  <div className="flex items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                    <Clock className="w-8 h-8 text-green-600 mr-3" />
                    <div>
                      <p className="font-semibold text-gray-800">Clinical Hours</p>
                      <p className="text-sm text-gray-600">384 / 480 hours</p>
                    </div>
                  </div>
                  <div className="flex items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                    <Award className="w-8 h-8 text-emerald-600 mr-3" />
                    <div>
                      <p className="font-semibold text-gray-800">Completion</p>
                      <p className="text-sm text-gray-600">80% Complete</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full opacity-20 animate-pulse delay-1000"></div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="text-center mt-16 animate-bounce">
          <ChevronDown className="w-6 h-6 mx-auto text-gray-400" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed specifically for midwifery students and educators
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`group relative p-8 rounded-2xl transition-all duration-500 hover:shadow-2xl cursor-pointer ${
                    activeFeature === index 
                      ? 'bg-gradient-to-br from-emerald-50 to-green-50 scale-105' 
                      : 'bg-gray-50 hover:bg-white'
                  }`}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>

                  {activeFeature === index && (
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-green-500/10 rounded-2xl animate-pulse"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-emerald-600 to-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="animate-fade-in-up">
              <div className="text-3xl md:text-4xl font-bold mb-2">250+</div>
              <div className="text-emerald-100">Active Students</div>
            </div>
            <div className="animate-fade-in-up delay-100">
              <div className="text-3xl md:text-4xl font-bold mb-2">15K+</div>
              <div className="text-emerald-100">Clinical Hours Logged</div>
            </div>
            <div className="animate-fade-in-up delay-200">
              <div className="text-3xl md:text-4xl font-bold mb-2">92%</div>
              <div className="text-emerald-100">Licensure Pass Rate</div>
            </div>
            <div className="animate-fade-in-up delay-300">
              <div className="text-3xl md:text-4xl font-bold mb-2">99.9%</div>
              <div className="text-emerald-100">System Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              How it Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get started with the Kumadronas System in just three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {howItWorksSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  {/* Connection Line */}
                  {index < howItWorksSteps.length - 1 && (
                    <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-emerald-200 to-green-200 z-0"></div>
                  )}
                  
                  <div className="relative z-10 text-center">
                    {/* Step Number */}
                    <div className={`w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center relative`}>
                      <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                        <Icon className="w-12 h-12 text-gray-700" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-sm font-bold text-gray-700">{step.step}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      {step.title}
                    </h3>
                    
                    <p className="text-gray-600 leading-relaxed max-w-sm mx-auto">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Additional Features Grid */}
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Real-time Updates</h4>
              <p className="text-sm text-gray-600">Get instant notifications about schedule changes</p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Secure Access</h4>
              <p className="text-sm text-gray-600">Your data is protected with enterprise security</p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Multi-Role Support</h4>
              <p className="text-sm text-gray-600">Students, parents, and administrators all connected</p>
            </div>

            <div className="text-center p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6 text-orange-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Progress Tracking</h4>
              <p className="text-sm text-gray-600">Monitor your journey and achievements</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
                Built for ISCC Midwifery Excellence
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <GraduationCap className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Student-Centered Design</h3>
                    <p className="text-gray-600">Designed with input from students and faculty to meet real needs.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Heart className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Caring Community</h3>
                    <p className="text-gray-600">Fostering connection and support among students, faculty, and families.</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <BookOpen className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Academic Excellence</h3>
                    <p className="text-gray-600">Supporting the highest standards of midwifery education and practice.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">Ilocos Sur Community College</h3>
                <p className="text-emerald-100 mb-6">
                  Empowering the next generation of healthcare professionals with innovative technology 
                  and comprehensive education in midwifery.
                </p>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">8+</div>
                    <div className="text-emerald-100 text-sm">Years of Excellence</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">87%</div>
                    <div className="text-emerald-100 text-sm">Board Pass Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 via-green-50 to-slate-50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
            Ready to Transform Your Midwifery Journey?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join hundreds of ISCC students already using the Comadronas System to excel in their studies.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onGetStarted}
              className="group bg-gradient-to-r from-emerald-600 to-green-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center"
            >
              Get Started Today
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mt-6">
            Free for all ISCC students • Secure & Private • Available 24/7
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
                <img 
                  src="/image0.png" 
                  alt="ISCC Midwifery Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-2xl font-bold">Comadronas System</span>
            </div>
            <p className="text-gray-400 mb-6">
              Empowering ISCC midwifery students with smart scheduling solutions
            </p>
            <p className="text-sm text-gray-500">
              © 2025 Ilocos Sur Community College. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }

        .delay-100 {
          animation-delay: 100ms;
        }

        .delay-200 {
          animation-delay: 200ms;
        }

        .delay-300 {
          animation-delay: 300ms;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
