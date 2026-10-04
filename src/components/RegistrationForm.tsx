import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { events } from '@/src/data/events';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { apiService, RegistrationData } from '@/src/services/api';
import { CheckCircle2, AlertTriangle, Upload, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/src/lib/utils';

import { QRCodeCanvas } from 'qrcode.react';

export const RegistrationForm: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<RegistrationData>>({
    eventId: '',
    fullName: '',
    email: '',
    phone: '',
    college: '',
    studentId: '',
    year: '1st Year',
    branch: '',
    teamName: '',
    teamCaptain: '',
    teamMembers: [],
  });

  const [screenshot, setScreenshot] = useState<{ file: File, preview: string } | null>(null);

  // Handle external event selection (from event cards)
  useEffect(() => {
    const handleSelectEvent = (e: any) => {
      const selectedEvent = events.find(ev => ev.id === e.detail);
      if (selectedEvent) {
        setFormData(prev => ({ 
          ...prev, 
          eventId: selectedEvent.id,
          eventName: selectedEvent.name,
          category: selectedEvent.category,
          format: selectedEvent.format,
          paymentRequired: selectedEvent.fee > 0,
          paymentAmount: selectedEvent.fee
        }));
        setStep(2);
      }
    };
    window.addEventListener('select-event', handleSelectEvent);
    return () => window.removeEventListener('select-event', handleSelectEvent);
  }, []);

  const selectedEvent = events.find(e => e.id === formData.eventId);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size should be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot({ file, preview: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const nextStep = () => {
    if (step === 1 && !formData.eventId) return;
    if (step === 2 && (!formData.fullName || !formData.email || !formData.studentId)) return;
    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload: RegistrationData = {
        ...formData,
        paymentScreenshot: screenshot ? {
          type: screenshot.file.type,
          base64: screenshot.preview
        } : undefined
      } as RegistrationData;

      const response = await apiService.register(payload);
      
      if (response.success) {
        setSuccessData({
          ...response,
          participantName: formData.fullName,
          eventName: formData.eventName,
          email: formData.email
        });
        setStep(6);
      } else {
        setError(response.message || "An unexpected error occurred.");
      }
    } catch (err) {
      setError("Failed to submit registration. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold uppercase tracking-wider mb-8">Step 1: Select Your Event</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => {
                    setFormData(prev => ({ 
                      ...prev, 
                      eventId: ev.id,
                      eventName: ev.name,
                      category: ev.category,
                      format: ev.format,
                      paymentRequired: ev.fee > 0,
                      paymentAmount: ev.fee
                    }));
                    setStep(2);
                  }}
                  className={cn(
                    "p-6 text-left border transition-all flex flex-col gap-2",
                    formData.eventId === ev.id 
                      ? "bg-cyan-500/10 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)]" 
                      : "bg-white/5 border-white/10 hover:border-white/30"
                  )}
                >
                  <span className="text-[10px] font-mono text-cyan-500 uppercase">#{ev.id} · {ev.category}</span>
                  <span className="text-lg font-bold">{ev.name}</span>
                  <span className="text-xs text-white/40">{ev.format} · {ev.fee > 0 ? `₹${ev.fee}` : 'FREE'}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold uppercase tracking-wider mb-8">Step 2: Participant Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <Input label="Full Name" name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="Enter your full name" required />
              <Input label="Email Address" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="yourname@example.com" required />
              <Input label="Mobile Number" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="10-digit phone number" required />
              <Input label="College / Institution" name="college" value={formData.college} onChange={handleInputChange} placeholder="Your college name" required />
              <Input label="Student ID / Enrollment" name="studentId" value={formData.studentId} onChange={handleInputChange} placeholder="University Roll No." required />
              <Select 
                label="Current Year" 
                name="year" 
                value={formData.year} 
                onChange={handleInputChange}
                options={[
                  { label: '1st Year', value: '1st Year' },
                  { label: '2nd Year', value: '2nd Year' },
                  { label: '3rd Year', value: '3rd Year' },
                  { label: '4th Year', value: '4th Year' },
                ]}
              />
              <Input label="Branch / Department" name="branch" value={formData.branch} onChange={handleInputChange} placeholder="e.g. CSE, ECE, IT" required />
            </div>
            <div className="flex justify-between pt-8">
              <Button variant="outline" onClick={prevStep}><ChevronLeft className="mr-2" /> Back</Button>
              <Button variant="secondary" onClick={nextStep} disabled={!formData.fullName || !formData.email || !formData.studentId}>
                Next <ChevronRight className="ml-2" />
              </Button>
            </div>
          </div>
        );

      case 3:
        if (selectedEvent?.format === 'Solo') {
          setStep(4);
          return null;
        }
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold uppercase tracking-wider mb-8">Step 3: Team Details</h3>
            <p> In Gamer Fiesta 2.0, there are three gaming categories: BGMI, Valorant, and Free Fire. Please mention the game name along with your team name in the following format:<br></br>
            Team Name – Game Name <br></br>
            Example: If your team name is XYZ and you want to participate in BGMI, enter your team name as:<br></br>
            XYZ-BGMI<br></br>
            Similarly:<br></br>
            - XYZ-VALORANT<br></br>
            - XYZ-FREE FIRE<br></br>
            Please make sure to follow this format while registering.</p>
            <div className="space-y-6">
              <Input label="Team Name" name="teamName" value={formData.teamName} onChange={handleInputChange} placeholder="Enter team name" />
              <Input label="Team Captain Name" name="teamCaptain" value={formData.teamCaptain} onChange={handleInputChange} placeholder="Captain name" />
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Team Members (Optional)</label>
                <textarea 
                  className="w-full h-32 bg-white/5 border border-white/10 p-4 text-sm focus:border-cyan-500/50 outline-none"
                  placeholder="Enter other team members' names and details..."
                  value={formData.teamMembers?.join('\n')}
                  onChange={(e) => setFormData(prev => ({ ...prev, teamMembers: e.target.value.split('\n') }))}
                />
              </div>
            </div>
            <div className="flex justify-between pt-8">
              <Button variant="outline" onClick={prevStep}><ChevronLeft className="mr-2" /> Back</Button>
              <Button variant="secondary" onClick={nextStep}>Next <ChevronRight className="ml-2" /></Button>
            </div>
          </div>
        );

      case 4:
        if (!selectedEvent?.fee) {
          setStep(5);
          return null;
        }
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold uppercase tracking-wider mb-8">Step 4: Payment Verification</h3>
            <div className="bg-cyan-500/10 border border-cyan-500/20 p-8 flex flex-col items-center text-center">
              <p className="text-sm text-white/60 mb-2 uppercase tracking-widest">Entry Fee for {selectedEvent.name}</p>
              <p className="text-5xl font-display font-bold text-white mb-8">₹{selectedEvent.fee}</p>
              
              <div className="w-full max-w-sm space-y-4 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-inner flex flex-col items-center">
                  <div className="aspect-square bg-white flex items-center justify-center p-2 border border-slate-200">
                    <QRCodeCanvas 
                      value={`upi://pay?pa=7880435856@paytm&am=${selectedEvent.fee}.00&cu=INR`}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Official UPI Scan</p>
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                      <span className="text-[10px] font-mono font-bold text-slate-700">7880435856@paytm</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText('7880435856@paytm');
                          alert('UPI ID copied to clipboard');
                        }}
                        className="text-[10px] text-cyan-600 font-bold uppercase hover:text-cyan-700"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-white/40 italic">Scan to pay ₹{selectedEvent.fee} or use the UPI ID above</p>
              </div>

              <div className="w-full text-left space-y-4">
                <label className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Upload Payment Screenshot</label>
                <div className="relative border-2 border-dashed border-white/20 hover:border-cyan-500/50 transition-colors p-8 flex flex-col items-center justify-center cursor-pointer">
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleScreenshotUpload} accept="image/*" />
                  {screenshot ? (
                    <div className="relative w-full aspect-video bg-black/40">
                      <img src={screenshot.preview} alt="Preview" className="w-full h-full object-contain" />
                      <button onClick={() => setScreenshot(null)} className="absolute top-2 right-2 p-1 bg-red-500 rounded-full"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-white/20" />
                      <p className="text-sm text-white/40">Click or drag to upload (Max 2MB)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-between pt-8">
              <Button variant="outline" onClick={prevStep}><ChevronLeft className="mr-2" /> Back</Button>
              <Button variant="secondary" onClick={nextStep} disabled={!screenshot}>Next <ChevronRight className="ml-2" /></Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold uppercase tracking-wider mb-8">Step 5: Review & Submit</h3>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 border border-white/5">
                  <p className="text-[10px] uppercase text-white/40">Event</p>
                  <p className="text-sm font-bold">{formData.eventName}</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5">
                  <p className="text-[10px] uppercase text-white/40">Participant</p>
                  <p className="text-sm font-bold">{formData.fullName}</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5">
                  <p className="text-[10px] uppercase text-white/40">Student ID</p>
                  <p className="text-sm font-bold">{formData.studentId}</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5">
                  <p className="text-[10px] uppercase text-white/40">Team</p>
                  <p className="text-sm font-bold">{formData.teamName || 'Solo Entry'}</p>
                </div>
              </div>
              
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 flex gap-3 text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="p-6 bg-cyan-500/5 border border-cyan-500/20 text-xs text-white/60 leading-relaxed italic">
                By clicking submit, you agree to the event rules and acknowledge that a participant ID (Roll No + Email) can register for a maximum of 2 different events.
              </div>
            </div>
            <div className="flex justify-between pt-8">
              <Button variant="outline" onClick={prevStep}><ChevronLeft className="mr-2" /> Back</Button>
              <Button variant="secondary" size="lg" className="flex-1 ml-4" onClick={handleSubmit} isLoading={loading}>
                Confirm Registration
              </Button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="text-center py-12 space-y-8">
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-green-500/20 border border-green-500/50 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
            </div>
            
            <div>
              <h3 className="text-3xl font-display font-bold uppercase mb-2">Registration Successful</h3>
              <p className="text-white/60">Your registration ID is <span className="text-cyan-400 font-mono font-bold">{successData.registrationId}</span></p>
            </div>

            <div className="max-w-md mx-auto p-8 bg-white/5 border border-white/10 space-y-6 text-left">
              <div className="flex justify-between border-b border-white/5 pb-4">
                <span className="text-xs text-white/40 uppercase">Event</span>
                <span className="text-sm font-bold">{successData.eventName}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-4">
                <span className="text-xs text-white/40 uppercase">Participant</span>
                <span className="text-sm font-bold">{successData.participantName}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-4">
                <span className="text-xs text-white/40 uppercase">Status</span>
                <span className="text-xs font-bold text-yellow-400 uppercase bg-yellow-400/10 px-2 py-0.5">{successData.paymentStatus}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="secondary" onClick={() => window.print()}>Download Confirmation</Button>
              <Button variant="outline" onClick={() => {
                setStep(1);
                setFormData({ ...formData, eventId: '' });
                setSuccessData(null);
                setScreenshot(null);
              }}>Register for another event</Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section id="registration" className="section-padding bg-black relative">
      <div className="container-width">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Join the <span className="text-cyan-500">Battle</span>
            </h2>
            <p className="text-white/60 max-w-xl mx-auto uppercase tracking-widest text-sm">
              Secure your spot in TechSpardha 2K26. Follow the steps below.
            </p>
          </div>

          <div className="bg-neutral-900 border border-white/10 p-8 md:p-12 relative">
            {/* Step Indicator */}
            {step < 6 && (
              <div className="flex items-center gap-4 mb-12">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div 
                    key={s} 
                    className={cn(
                      "flex-1 h-1 transition-all duration-500",
                      step >= s ? "bg-cyan-500" : "bg-white/10"
                    )} 
                  />
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
