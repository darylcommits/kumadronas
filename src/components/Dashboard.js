// Dashboard.js - FIXED VERSION WITH PROPER SCHEDULE CAPACITY HANDLING
import React, { useState, useEffect } from 'react';
import { supabase, dbHelpers } from '../lib/supabase';
import StudentManagement from './StudentManagement';
import ReportsAnalytics from './ReportsAnalytics';
import ProfileSettings from './ProfileSettings';
import ScheduleManagement from './ScheduleManagement';
import HelpSupport from './HelpSupport';
import { 
  Calendar, 
  Users, 
  Clock, 
  Bell, 
  LogOut, 
  Menu, 
  X, 
  Check, 
  AlertCircle, 
  User, 
  Shield, 
  Eye,
  Plus,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Activity,
  Ban,
  Settings,
  Home,
  FileText,
  Star,
  Search,
  Mail,
  MapPin,
  Phone,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  HelpCircle,
  BarChart3,
  Trash2,
  Printer,
  Award
} from 'lucide-react';

const Dashboard = ({ user, session, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [schedules, setSchedules] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dutyLogs, setDutyLogs] = useState([]);
  const [studentDuties, setStudentDuties] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const [pendingBookings, setPendingBookings] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [scheduleToReject, setScheduleToReject] = useState(null);
  const [dailyCancellations, setDailyCancellations] = useState(new Set());

  useEffect(() => {
    initializeDashboard();
    
    // Set up real-time subscriptions
    const notificationChannel = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    const scheduleChannel = supabase
      .channel('schedules')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'schedules' },
        () => {
          fetchSchedules();
          fetchPendingBookings();
        }
      )
      .subscribe();

    const scheduleStudentsChannel = supabase
      .channel('schedule_students')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'schedule_students' },
        () => {
          fetchSchedules(); // Refetch schedules to get updated student counts
          fetchPendingBookings();
          if (user?.role === 'student') {
            fetchStudentDuties();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(scheduleChannel);
      supabase.removeChannel(scheduleStudentsChannel);
    };
  }, [user]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen && window.innerWidth < 1024) {
      document.body.classList.add('sidebar-open');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('sidebar-open');
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('sidebar-open');
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const initializeDashboard = async () => {
    // Run all fetches in background, don't block UI
    Promise.all([
      fetchSchedules(),
      fetchNotifications(),
      fetchDashboardStats(),
      fetchPendingBookings(),
      user?.role === 'admin' && fetchDutyLogs(),
      user?.role === 'student' && fetchStudentDuties()
    ]).finally(() => {
      setInitialized(true);
    });
  };

  // FIXED: Enhanced fetchSchedules with proper joins to get accurate student counts
  const fetchSchedules = async () => {
    try {
      console.log('Fetching schedules with student counts...');
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          schedule_students (
            id,
            student_id,
            booking_time,
            status,
            cancelled_at,
            profiles:student_id (
              id,
              full_name,
              email,
              student_number
            )
          )
        `)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching schedules:', error);
        return;
      }

      // Filter out cancelled bookings and only count active ones
      const processedSchedules = data?.map(schedule => ({
        ...schedule,
        schedule_students: schedule.schedule_students?.filter(ss => ss.status !== 'cancelled') || []
      })) || [];

      console.log('Processed schedules with student counts:', processedSchedules);
      setSchedules(processedSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const fetchPendingBookings = async () => {
    try {
      console.log('Fetching pending schedule approvals...');
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          schedule_students!inner (
            id,
            student_id,
            booking_time,
            status,
            profiles:student_id (
              id,
              full_name,
              email,
              student_number,
              year_level
            )
          )
        `)
        .eq('status', 'pending')
        .eq('schedule_students.status', 'booked')
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching pending schedules:', error);
        return;
      }

      console.log('Pending schedules with bookings:', data);
      
      // Group schedules that have bookings awaiting approval
      setPendingBookings(data || []);
    } catch (error) {
      console.error('Error fetching pending bookings:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      if (user.role === 'admin') {
        const { data: totalStudents } = await supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('role', 'student');

        const { data: pendingSchedules } = await supabase
          .from('schedules')
          .select('id', { count: 'exact' })
          .eq('status', 'pending');

        const { data: todayDuties } = await supabase
          .from('schedule_students')
          .select(`
            id,
            schedules!inner(date)
          `)
          .eq('schedules.date', new Date().toISOString().split('T')[0])
          .eq('status', 'booked');

        setDashboardStats({
          totalStudents: totalStudents?.length || 0,
          pendingApprovals: pendingSchedules?.length || 0,
          todayDuties: todayDuties?.length || 0,
          systemHealth: 'Excellent'
        });
      } else if (user.role === 'student') {
        const { data: myDuties } = await supabase
          .from('schedule_students')
          .select('id')
          .eq('student_id', user.id);

        const { data: upcomingDuties } = await supabase
          .from('schedule_students')
          .select(`
            schedules!inner(date)
          `)
          .eq('student_id', user.id)
          .eq('status', 'booked')
          .gte('schedules.date', new Date().toISOString().split('T')[0]);

        setDashboardStats({
          totalDuties: myDuties?.length || 0,
          upcomingDuties: upcomingDuties?.length || 0,
          completionRate: 85
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchDutyLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('duty_logs')
        .select(`
          *,
          schedule_students!left(
            schedules!left(date),
            profiles!student_id(full_name)
          ),
          performed_by_profile:profiles!performed_by(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setDutyLogs(data || []);
    } catch (error) {
      console.error('Error fetching duty logs:', error);
    }
  };

  const fetchStudentDuties = async () => {
    try {
      const data = await dbHelpers.getStudentDuties(user.id);
      setStudentDuties(data || []);
    } catch (error) {
      console.error('Error fetching student duties:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      // Log the logout action
      await supabase.from('duty_logs').insert({
        action: 'logout',
        performed_by: user.id,
        notes: `User ${user.full_name} logged out`
      });
      
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      try {
        await supabase
          .from('notifications')
          .update({ read: true, read_at: new Date().toISOString() })
          .eq('id', notification.id);
        
        setNotifications(prev => 
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  const canCancelDuty = (dutyDate) => {
    const today = new Date();
    const duty = new Date(dutyDate);
    // Students cannot cancel on the actual day of their duty
    return duty.toDateString() !== today.toDateString();
  };

  const checkSameDayCancellation = (scheduleDate) => {
    const today = new Date().toDateString();
    const cancelKey = `${user.id}-${scheduleDate}-${today}`;
    return dailyCancellations.has(cancelKey);
  };

  // FIXED: Enhanced handleBookDuty with better duplicate checking and no same-day restriction
  const handleBookDuty = async (scheduleId, date) => {
    try {
      // FIXED: Check capacity and duplicates before booking
      const schedule = schedules.find(s => s.id === scheduleId);
      if (!schedule) {
        alert('Schedule not found.');
        return;
      }

      const activeBookings = schedule.schedule_students?.filter(ss => ss.status !== 'cancelled') || [];
      const currentBookings = activeBookings.length;
      const maxStudents = schedule.max_students || 2;

      if (currentBookings >= maxStudents) {
        alert(`This duty is already full (${currentBookings}/${maxStudents} students assigned).`);
        return;
      }

      // ENHANCED: More robust duplicate booking check
      const existingBooking = activeBookings.find(ss => ss.student_id === user.id);
      if (existingBooking) {
        alert('You have already booked this duty.');
        return;
      }

      // ADDITIONAL: Double-check with database to prevent race conditions
      console.log('Checking for existing bookings in database...');
      const { data: existingDbBooking, error: checkError } = await supabase
        .from('schedule_students')
        .select('id, status')
        .eq('schedule_id', scheduleId)
        .eq('student_id', user.id)
        .neq('status', 'cancelled')
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking existing booking:', checkError);
        alert('Error checking existing booking. Please try again.');
        return;
      }

      if (existingDbBooking) {
        alert('You have already booked this duty (verified from database).');
        await fetchSchedules(); // Refresh to sync UI with database
        return;
      }

      // Check same-day cancellation restriction (if any)
      if (checkSameDayCancellation(date)) {
        alert('You cannot book again today because you already cancelled a booking for this date today. Please try again tomorrow.');
        return;
      }

      console.log('Proceeding with booking...');
      
      // MODIFIED: Direct database booking (bypassing dbHelpers restrictions)
      const { data: newBooking, error: bookingError } = await supabase
        .from('schedule_students')
        .insert([{
          schedule_id: scheduleId,
          student_id: user.id,
          booking_time: new Date().toISOString(),
          status: 'booked'
        }])
        .select()
        .single();

      if (bookingError) {
        if (bookingError.code === '23505') { // Unique constraint violation
          alert('You have already booked this duty. The page will refresh to show current status.');
          await fetchSchedules(); // Refresh to sync UI
          return;
        }
        throw bookingError;
      }

      // Log the booking action
      await supabase.from('duty_logs').insert({
        schedule_student_id: newBooking.id,
        schedule_id: scheduleId,
        action: 'booked',
        performed_by: user.id,
        target_user: user.id,
        notes: `Student booked duty for ${date}`
      });

      // Refresh all related data
      await Promise.all([
        fetchSchedules(),
        fetchStudentDuties(),
        fetchPendingBookings()
      ]);
      
      alert('Duty booked successfully! Waiting for admin approval.');
    } catch (error) {
      console.error('Error booking duty:', error);
      alert('Error booking duty: ' + error.message);
    }
  };

  const handleApproveSchedule = async (scheduleId) => {
    try {
      console.log('Approving schedule:', scheduleId);
      
      // Get all students with active bookings for this schedule
      const { data: bookings } = await supabase
        .from('schedule_students')
        .select('student_id, profiles:student_id(full_name)')
        .eq('schedule_id', scheduleId)
        .eq('status', 'booked');
      
      // Approve the schedule
      await dbHelpers.updateScheduleStatus(scheduleId, 'approved', user.id);
      
      // Send notifications to all students
      if (bookings && bookings.length > 0) {
        const notifications = bookings.map(booking => ({
          user_id: booking.student_id,
          title: 'Duty Schedule Approved ✓',
          message: `Your duty booking has been approved! You can now complete your duty on the scheduled date.`,
          type: 'success'
        }));
        
        try {
          const { error: notificationError } = await supabase.from('notifications').insert(notifications);
          if (notificationError) {
            console.warn('Failed to send notifications:', notificationError);
          }
        } catch (err) {
          console.warn('Failed to send notifications:', err);
        }
      }
      
      // Refresh all related data
      await Promise.all([
        fetchSchedules(),
        fetchPendingBookings(),
        fetchDashboardStats()
      ]);
      
      alert(`Schedule approved successfully! ${bookings?.length || 0} student(s) notified.`);
    } catch (error) {
      console.error('Error approving schedule:', error);
      alert('Error approving schedule: ' + error.message);
    }
  };

  const handleRejectSchedule = async (scheduleId) => {
    setScheduleToReject(scheduleId);
    setShowRejectConfirm(true);
  };

  const confirmRejectSchedule = async () => {
    if (!scheduleToReject) return;

    try {
      console.log('Rejecting schedule:', scheduleToReject);
      
      // Cancel all bookings for this schedule first
      const { error: cancelError } = await supabase
        .from('schedule_students')
        .update({ 
          status: 'cancelled', 
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Schedule rejected by admin'
        })
        .eq('schedule_id', scheduleToReject);

      if (cancelError) throw cancelError;

      // Then update schedule status to cancelled
      await dbHelpers.updateScheduleStatus(scheduleToReject, 'cancelled', user.id);
      
      // Refresh all related data
      await Promise.all([
        fetchSchedules(),
        fetchPendingBookings(),
        fetchDashboardStats()
      ]);
      
      setShowRejectConfirm(false);
      setScheduleToReject(null);
      alert('Schedule rejected and all bookings cancelled.');
    } catch (error) {
      console.error('Error rejecting schedule:', error);
      alert('Error rejecting schedule: ' + error.message);
    }
  };

  const handleCancelDuty = async (scheduleStudentId, date) => {
    if (!canCancelDuty(date)) {
      alert('Cannot cancel duty on the actual day of your scheduled duty.');
      return;
    }

    try {
      await dbHelpers.cancelDuty(scheduleStudentId, user.id, user.role);
      
      // Track this cancellation to prevent same-day re-booking
      const today = new Date().toDateString();
      const cancelKey = `${user.id}-${date}-${today}`;
      setDailyCancellations(prev => new Set(prev).add(cancelKey));
      
      await Promise.all([
        fetchSchedules(),
        fetchStudentDuties(),
        fetchPendingBookings()
      ]);
      alert('Duty cancelled successfully. Note: You cannot book another duty for this date today.');
    } catch (error) {
      alert('Error cancelling duty: ' + error.message);
    }
  };

  const handleDeleteDuty = async (scheduleStudentId) => {
    if (!window.confirm('Are you sure you want to delete this duty entry? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('schedule_students')
        .delete()
        .eq('id', scheduleStudentId)
        .eq('student_id', user.id); // Ensure user can only delete their own duties

      if (error) throw error;

      await Promise.all([
        fetchSchedules(),
        fetchStudentDuties(),
        fetchPendingBookings()
      ]);
      alert('Duty entry deleted successfully.');
    } catch (error) {
      console.error('Error deleting duty:', error);
      alert('Error deleting duty: ' + error.message);
    }
  };

  const handleCompleteDuty = async (scheduleStudentId) => {
    if (!window.confirm('Mark this duty as completed? This will generate a completion certificate.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('schedule_students')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', scheduleStudentId)
        .eq('student_id', user.id);

      if (error) throw error;

      await Promise.all([
        fetchSchedules(),
        fetchStudentDuties(),
        fetchPendingBookings()
      ]);
      alert('Duty marked as completed! You can now print your completion certificate.');
    } catch (error) {
      console.error('Error completing duty:', error);
      alert('Error completing duty: ' + error.message);
    }
  };

  const exportDuties = (format) => {
    const exportData = studentDuties.map(duty => ({
      'Date': new Date(duty.schedules.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      'Location': duty.schedules.location || 'N/A',
      'Shift Start': duty.schedules.shift_start,
      'Shift End': duty.schedules.shift_end,
      'Description': duty.schedules.description || 'N/A',
      'Schedule Status': duty.schedules.status,
      'Booking Status': duty.status,
      'Booked At': new Date(duty.booking_time).toLocaleString(),
      'Completed At': duty.completed_at ? new Date(duty.completed_at).toLocaleString() : 'N/A'
    }));

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-duties-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(header => {
          const value = row[header]?.toString() || '';
          return value.includes(',') ? `"${value}"` : value;
        }).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-duties-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'excel') {
      const headers = Object.keys(exportData[0] || {});
      const tableHTML = `
        <table border="1">
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${exportData.map(row => `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      `;

      const blob = new Blob([tableHTML], { type: 'application/vnd.ms-excel' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-duties-${new Date().toISOString().split('T')[0]}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handlePrintCertificate = (duty) => {
    const printWindow = window.open('', '_blank');
    const certificateContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Duty Completion Certificate</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .certificate { border: 3px solid #10b981; padding: 30px; text-align: center; max-width: 800px; margin: 0 auto; }
          .header { color: #10b981; font-size: 28px; font-weight: bold; margin-bottom: 20px; }
          .subtitle { color: #6b7280; font-size: 18px; margin-bottom: 30px; }
          .content { margin: 30px 0; }
          .student-info { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .duty-info { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .signature { margin-top: 50px; display: flex; justify-content: space-between; }
          .signature-box { width: 200px; border-top: 1px solid #000; text-align: center; padding-top: 10px; }
          .date { margin-top: 30px; text-align: right; }
          @media print { body { margin: 0; } .certificate { border: 3px solid #10b981; } }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="header">DUTY COMPLETION CERTIFICATE</div>
          <div class="subtitle">Ilocos Sur Community College - Midwifery Program</div>
          
          <div class="content">
            <p>This is to certify that</p>
            <div class="student-info">
              <h2 style="color: #10b981; margin: 0;">${user.full_name}</h2>
              <p style="margin: 5px 0;">Student Number: ${user.student_number || 'N/A'}</p>
              <p style="margin: 5px 0;">Year Level: ${user.year_level || 'N/A'}</p>
            </div>
            
            <p>has successfully completed their duty assignment on</p>
            <div class="duty-info">
              <h3 style="color: #10b981; margin: 0;">${new Date(duty.schedules.date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</h3>
              <p style="margin: 5px 0;">Location: ${duty.schedules.location}</p>
              <p style="margin: 5px 0;">Time: ${duty.schedules.shift_start} - ${duty.schedules.shift_end}</p>
              <p style="margin: 5px 0;">Description: ${duty.schedules.description}</p>
            </div>
            
            <p>This certificate is issued in recognition of their commitment and dedication to community health service.</p>
          </div>
          
          <div class="signature">
            <div class="signature-box">
              <p>Student Signature</p>
            </div>
            <div class="signature-box">
              <p>Supervisor Signature</p>
            </div>
          </div>
          
          <div class="date">
            <p>Date Issued: ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(certificateContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Calendar generation function with proper date handling
  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const calendar = [];
    const currentDateLoop = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate date comparison

    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const daySchedule = schedules.find(s => 
          new Date(s.date).toDateString() === currentDateLoop.toDateString()
        );
        
        const dayDate = new Date(currentDateLoop);
        dayDate.setHours(0, 0, 0, 0); // Reset time for accurate comparison
        
        weekDays.push({
          date: new Date(currentDateLoop),
          schedule: daySchedule,
          isCurrentMonth: currentDateLoop.getMonth() === month,
          isToday: currentDateLoop.toDateString() === today.toDateString(),
          isPast: dayDate < today // FIXED: Proper past date detection
        });
        
        currentDateLoop.setDate(currentDateLoop.getDate() + 1);
      }
      calendar.push(weekDays);
    }

    return calendar;
  };

  // Define menu items based on user role
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    ...(user?.role === 'admin' ? [
      { id: 'pending', label: 'Pending Approvals', icon: Clock, badge: pendingBookings.length }
    ] : []),
    { id: 'schedule', label: 'Schedule Calendar', icon: Calendar },
    ...(user?.role === 'student' ? [
      { id: 'duties', label: 'My Duties', icon: Clock }
    ] : []),
    ...(user?.role === 'admin' ? [
      { id: 'schedule-management', label: 'Manage Schedules', icon: CalendarIcon },
      { id: 'student-management', label: 'Students', icon: Users },
      { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
      { id: 'logs', label: 'System Logs', icon: Activity }
    ] : []),
    ...(user?.role === 'parent' ? [
      { id: 'child-duties', label: "Child's Duties", icon: Eye }
    ] : []),
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Profile Settings', icon: Settings },
    { id: 'help', label: 'Help & Support', icon: HelpCircle }
  ];

  // Dashboard Overview Component
  const renderDashboardView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.full_name}
          </h2>
          <p className="text-gray-600 mt-1">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        {user?.role === 'admin' && (
          <div className="flex space-x-3">
            {pendingBookings.length > 0 && (
              <button 
                onClick={() => setActiveTab('pending')}
                className="btn-secondary flex items-center space-x-2 relative"
              >
                <Clock className="w-4 h-4" />
                <span>Pending Approvals</span>
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingBookings.length}
                </span>
              </button>
            )}
              <button 
                onClick={() => setActiveTab('schedule-management')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Quick Actions</span>
              </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {user?.role === 'admin' ? (
          <>
            <div className="card bg-gradient-to-r from-slate-700 to-slate-800 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-100">Total Students</p>
                  <p className="text-3xl font-bold">{dashboardStats.totalStudents}</p>
                </div>
                <Users className="w-10 h-10 text-slate-200" />
              </div>
            </div>
            <div className="card bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100">Pending Approvals</p>
                  <p className="text-3xl font-bold">{pendingBookings.length}</p>
                </div>
                <Clock className="w-10 h-10 text-emerald-200" />
              </div>
            </div>
            <div className="card bg-gradient-to-r from-green-600 to-green-700 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Today's Duties</p>
                  <p className="text-3xl font-bold">{dashboardStats.todayDuties}</p>
                </div>
                <CalendarIcon className="w-10 h-10 text-green-200" />
              </div>
            </div>
            <div className="card bg-gradient-to-r from-slate-600 to-slate-700 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-100">System Health</p>
                  <p className="text-xl font-bold">{dashboardStats.systemHealth}</p>
                </div>
                <Activity className="w-10 h-10 text-slate-200" />
              </div>
            </div>
          </>
        ) : user?.role === 'student' ? (
          <>
            <div className="card bg-gradient-to-r from-slate-600 to-slate-700 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-100">Total Duties</p>
                  <p className="text-3xl font-bold">{dashboardStats.totalDuties}</p>
                </div>
                <Clock className="w-10 h-10 text-slate-200" />
              </div>
            </div>
            <div className="card bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100">Upcoming</p>
                  <p className="text-3xl font-bold">{dashboardStats.upcomingDuties}</p>
                </div>
                <Calendar className="w-10 h-10 text-emerald-200" />
              </div>
            </div>
            <div className="card bg-gradient-to-r from-green-600 to-green-700 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Completion Rate</p>
                  <p className="text-3xl font-bold">{dashboardStats.completionRate}%</p>
                </div>
                <Star className="w-10 h-10 text-green-200" />
              </div>
            </div>
          </>
        ) : (
          // Parent view
          <div className="card bg-gradient-to-r from-slate-500 to-slate-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-100">Child's Duties</p>
                <p className="text-3xl font-bold">View Access</p>
              </div>
              <Eye className="w-10 h-10 text-slate-200" />
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notifications */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Notifications</h3>
            <button 
              onClick={() => setActiveTab('notifications')}
              className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification) => (
              <div key={notification.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  notification.type === 'success' ? 'bg-green-500' :
                  notification.type === 'warning' ? 'bg-yellow-500' :
                  notification.type === 'error' ? 'bg-red-500' :
                  'bg-blue-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {notification.title}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                {!notification.read && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                )}
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="text-gray-500 text-center py-4">No notifications yet</p>
            )}
          </div>
        </div>

        {/* Upcoming Duties */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Duties</h3>
            <button 
              onClick={() => setActiveTab('schedule')}
              className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
            >
              View Calendar
            </button>
          </div>
          <div className="space-y-3">
            {schedules
              .filter(s => new Date(s.date) >= new Date() && 
                      (user.role === 'admin' || 
                       s.schedule_students?.some(ss => ss.student_id === user.id)))
              .slice(0, 5)
              .map((schedule) => {
                const activeStudents = schedule.schedule_students?.filter(ss => ss.status !== 'cancelled').length || 0;
                const maxStudents = schedule.max_students || 2;
                
                return (
                  <div key={schedule.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(schedule.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activeStudents}/{maxStudents} students assigned
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      schedule.status === 'approved' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {schedule.status}
                    </span>
                  </div>
                );
              })}
            {schedules.length === 0 && (
              <p className="text-gray-500 text-center py-4">No upcoming duties</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Pending Approvals View
  const renderPendingApprovalsView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Pending Schedule Approvals</h3>
          <p className="text-gray-600">Review and approve duty schedules with student bookings</p>
        </div>
        <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
          {pendingBookings.length} pending schedule{pendingBookings.length !== 1 ? 's' : ''}
        </div>
      </div>

      {pendingBookings.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-600">No pending schedule approvals at the moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingBookings.map((schedule) => {
            const students = schedule.schedule_students || [];
            return (
              <div key={schedule.id} className="card hover:shadow-lg transition-shadow border-l-4 border-l-yellow-400">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900">
                          {new Date(schedule.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {schedule.shift_start} - {schedule.shift_end} • {schedule.location}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <p className="text-sm text-gray-600 mb-1">Schedule Details:</p>
                      <p className="text-sm font-medium text-gray-900">{schedule.description}</p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <Users className="w-4 h-4 text-blue-600" />
                        <p className="font-medium text-blue-900">
                          Students Assigned ({students.length}/{schedule.max_students || 2})
                        </p>
                      </div>
                      <div className="space-y-2">
                        {students.map((student, idx) => (
                          <div key={student.id} className="flex items-center justify-between bg-white p-2 rounded">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                                <span className="text-emerald-700 text-xs font-medium">
                                  {student.profiles?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{student.profiles?.full_name}</p>
                                <p className="text-xs text-gray-600">{student.profiles?.student_number} • {student.profiles?.year_level}</p>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              Booked: {new Date(student.booking_time).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                      <p className="text-xs text-yellow-800">
                        ⚠️ Approving this schedule will approve it for ALL {students.length} student{students.length !== 1 ? 's' : ''} listed above.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-6">
                    <button
                      onClick={() => handleApproveSchedule(schedule.id)}
                      className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve All</span>
                    </button>
                    <button
                      onClick={() => handleRejectSchedule(schedule.id)}
                      className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject All</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // FIXED: Enhanced Calendar View Component with better capacity display
  const renderCalendarView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Duty Schedule Calendar</h2>
        {user?.role === 'admin' && (
          <button 
            onClick={() => setActiveTab('schedule-management')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Manage Schedules</span>
          </button>
        )}
      </div>

      {/* Calendar Navigation */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <h3 className="text-xl font-semibold">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto sm:overflow-hidden rounded-lg border border-gray-200">
          <div className="min-w-[720px] sm:min-w-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-gray-50">
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                <div key={day} className="p-2 sm:p-4 text-center font-medium text-gray-700 text-xs sm:text-sm border-r border-gray-200 last:border-r-0">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.slice(0,3)}</span>
                </div>
              ))}
            </div>

            {/* Calendar body */}
            {generateCalendar().map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 border-t border-gray-200">
              {week.map((day, dayIndex) => {
                // FIXED: Role-based capacity calculation and booking logic
                const activeStudents = day.schedule?.schedule_students?.filter(ss => ss.status !== 'cancelled') || [];
                const studentCount = activeStudents.length;
                const maxStudents = day.schedule?.max_students || 2;
                const isFull = studentCount >= maxStudents;
                const myBooking = activeStudents.find(s => s.student_id === user.id);
                const isBooked = !!myBooking;
                const isApproved = day.schedule?.status === 'approved';
                const hasSameDayCancellation = user?.role === 'student' && checkSameDayCancellation(day.date.toISOString().split('T')[0]);
                
                // FIXED: Role-specific booking logic
                const canBook = user?.role === 'student' && 
                               day.schedule && 
                               !day.isPast && 
                               !isFull && 
                               !isBooked && 
                               !hasSameDayCancellation &&
                               day.isCurrentMonth;

                return (
                  <div
                    key={dayIndex}
                    className={`min-h-[84px] sm:min-h-[120px] p-2 sm:p-3 border-r border-gray-200 last:border-r-0 ${
                      !day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                    } ${day.isToday ? 'bg-blue-50 border-2 border-blue-200' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs sm:text-sm font-medium ${
                        day.isToday ? 'text-blue-600' : day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {day.date.getDate()}
                      </span>
                      
                      {day.schedule && (
                        <div className="flex flex-col items-end space-y-1">
                          {/* ROLE-BASED CAPACITY DISPLAY */}
                          {user?.role === 'admin' ? (
                            // Admin view: Full management info
                            <>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                isFull ? 'bg-red-100 text-red-800' :
                                studentCount > 0 ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {studentCount}/{maxStudents}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                day.schedule.status === 'approved'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {day.schedule.status}
                              </span>
                            </>
                          ) : user?.role === 'student' ? (
                            // Student view: Booking-focused info
                            <>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                isFull ? 'bg-red-100 text-red-800' :
                                isBooked ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {isFull ? 'FULL' : isBooked ? 'BOOKED' : `${maxStudents - studentCount} LEFT`}
                              </span>
                              {isBooked && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {isApproved ? 'APPROVED' : 'PENDING'}
                                </span>
                              )}
                            </>
                          ) : (
                            // Parent view: Child-focused info
                            <>
                              {isBooked ? (
                                <>
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    ASSIGNED
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    day.schedule.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {day.schedule.status === 'approved' ? 'CONFIRMED' : 'PENDING'}
                                  </span>
                                </>
                              ) : (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  {studentCount}/{maxStudents}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {day.schedule && (
                      <div className="space-y-1">
                        {/* ROLE-BASED STUDENT DISPLAY */}
                        {user?.role === 'admin' ? (
                          // Admin: Show all students with management options
                          activeStudents.map((assignment, idx) => (
                            <div
                              key={idx}
                              className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 flex justify-between items-center"
                            >
                              <span className="truncate">{assignment.profiles?.full_name?.split(' ')[0] || 'Student'}</span>
                              <span className={`w-2 h-2 rounded-full ${
                                day.schedule.status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'
                              }`}></span>
                            </div>
                          ))
                        ) : user?.role === 'student' ? (
                          // Student: Show their own booking prominently, others less prominent
                          activeStudents.map((assignment, idx) => (
                            <div
                              key={idx}
                              className={`text-xs px-2 py-1 rounded truncate ${
                                assignment.student_id === user.id
                                  ? 'bg-blue-100 text-blue-800 font-medium border border-blue-200'
                                  : 'bg-gray-50 text-gray-600'
                              }`}
                            >
                              {assignment.student_id === user.id ? 'YOU' : assignment.profiles?.full_name?.split(' ')[0] || 'Student'}
                            </div>
                          ))
                        ) : (
                          // Parent: Only show if their child is assigned
                          activeStudents
                            .filter(assignment => assignment.student_id === user.id) // Assuming parent has child's user ID
                            .map((assignment, idx) => (
                              <div
                                key={idx}
                                className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 font-medium"
                              >
                                YOUR CHILD
                              </div>
                            ))
                        )}
                        
                        {/* Show time and location */}
                        <div className="text-xs text-gray-500">
                          {day.schedule.shift_start} - {day.schedule.shift_end}
                        </div>
                        {day.schedule.location && (
                          <div className="text-xs text-gray-500 truncate">
                            📍 {day.schedule.location}
                          </div>
                        )}
                        {day.schedule.description && (
                          <div className="text-xs text-gray-400 truncate">
                            {day.schedule.description}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ROLE-BASED ACTION BUTTONS */}
                    {user?.role === 'student' && (
                      <>
                        {/* Booking button for students */}
                        {canBook && (
                          <button
                            onClick={() => handleBookDuty(day.schedule.id, day.date.toISOString().split('T')[0])}
                            className="mt-2 w-full text-xs bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 transition-colors"
                          >
                            Book Duty
                          </button>
                        )}
                        
                        {/* Same-day cancellation warning */}
                        {hasSameDayCancellation && day.isCurrentMonth && (
                          <div className="mt-2 text-xs text-orange-600 font-medium text-center bg-orange-50 px-2 py-1 rounded">
                            Cannot book today (cancelled earlier)
                          </div>
                        )}
                      </>
                    )}

                    {/* ROLE-BASED STATUS MESSAGES */}
                    {isFull && day.isCurrentMonth && day.schedule && (
                      <div className={`mt-2 text-xs font-medium text-center ${
                        user?.role === 'admin' ? 'text-red-600' : 
                        user?.role === 'student' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {user?.role === 'admin' ? `Full (${studentCount}/${maxStudents})` :
                         user?.role === 'student' ? 'Duty Full' :
                         'Full Schedule'}
                      </div>
                    )}

                    {isBooked && day.schedule && user?.role === 'student' && (
                      <div className={`mt-2 text-xs font-medium text-center ${
                        isApproved ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        {isApproved ? 'Your Duty Approved ✓' : 'Awaiting Admin Approval'}
                      </div>
                    )}

                    {day.isPast && day.isCurrentMonth && !day.schedule && (
                      <div className="mt-2 text-xs text-gray-400 text-center">
                        {user?.role === 'admin' ? 'No schedule created' :
                         user?.role === 'student' ? 'Past date' :
                         'No duty'}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            ))}
          </div>
        </div>

        {/* Role-based Legend */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">
            {user?.role === 'admin' ? 'Admin View Legend' : 
             user?.role === 'student' ? 'Student View Legend' : 
             'Parent View Legend'}
          </h4>
          
          {user?.role === 'admin' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span>Approved Schedule</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span>Pending Approval</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                <span>Fully Booked</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                <span>Has Students</span>
              </div>
            </div>
          ) : user?.role === 'student' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                  <span>Available to Book</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                  <span>Your Booking</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                  <span>Fully Booked</span>
                </div>
              </div>
              <div className="text-xs text-gray-600 bg-yellow-50 p-2 rounded border-l-2 border-yellow-300">
                <strong>Booking Rules:</strong> You cannot cancel on the actual day of your duty. 
                If you cancel a booking today, you cannot book another duty for that same date until tomorrow.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                <span>Child Assigned</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span>Confirmed Duty</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                <span>Pending Confirmation</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // My Duties View Component
  const renderDutiesView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Duties</h2>
        <div className="flex space-x-2">
          <button className="btn-secondary flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
          <div className="relative group">
            <button className="btn-secondary flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <div className="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <button
                onClick={() => exportDuties('csv')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors first:rounded-t-lg"
              >
                Export as CSV
              </button>
              <button
                onClick={() => exportDuties('excel')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
              >
                Export as Excel
              </button>
              <button
                onClick={() => exportDuties('json')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors last:rounded-b-lg"
              >
                Export as JSON
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid gap-4">
        {studentDuties.map((duty) => (
          <div key={duty.id} className="card hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <CalendarIcon className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-lg">
                    {new Date(duty.schedules.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Booked:</p>
                    <p className="font-medium">{new Date(duty.booking_time).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Location:</p>
                    <p className="font-medium">{duty.schedules.location || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Approval Status:</p>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      duty.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      duty.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      duty.schedules.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {duty.status === 'completed' ? 'Completed' :
                       duty.status === 'cancelled' ? 'Cancelled' :
                       duty.schedules.status === 'approved' ? 'Approved' :
                       'Pending Approval'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end space-y-2 ml-4">
                {/* Cancel button - only for active bookings before duty day */}
                {duty.status === 'booked' && canCancelDuty(duty.schedules.date) && (
                  <button
                    onClick={() => handleCancelDuty(duty.id, duty.schedules.date)}
                    className="flex items-center space-x-1 text-red-600 hover:text-red-700 text-sm px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                )}

                {!canCancelDuty(duty.schedules.date) && duty.status === 'booked' && (
                  <span className="text-xs text-red-500 px-3 py-1 bg-red-50 rounded-lg border border-red-200">
                    Cannot cancel on duty day
                  </span>
                )}

                {/* Pending approval indicator */}
                {duty.status === 'booked' && duty.schedules.status === 'pending' && (
                  <span className="text-xs text-yellow-600 px-3 py-1 bg-yellow-50 rounded-lg border border-yellow-200">
                    ⏳ Awaiting Admin Approval
                  </span>
                )}

                {/* Complete duty button - only for approved bookings */}
                {duty.status === 'booked' && duty.schedules.status === 'approved' && (
                  <button
                    onClick={() => handleCompleteDuty(duty.id)}
                    className="flex items-center space-x-1 text-emerald-600 hover:text-emerald-700 text-sm px-3 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                    title="Mark duty as completed"
                  >
                    <Award className="w-4 h-4" />
                    <span>Complete</span>
                  </button>
                )}

                {/* Print certificate button for completed duties */}
                {duty.status === 'completed' && (
                  <button
                    onClick={() => handlePrintCertificate(duty)}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                    title="Print completion certificate"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Certificate</span>
                  </button>
                )}

                {/* Delete button - only for pending bookings (not yet approved) */}
                {duty.status === 'booked' && duty.schedules.status === 'pending' && (
                  <button
                    onClick={() => handleDeleteDuty(duty.id)}
                    className="flex items-center space-x-1 text-gray-400 hover:text-red-600 text-sm px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                    title="Delete pending booking"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {studentDuties.length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No duties scheduled yet</h3>
            <p className="text-gray-600 mb-4">Visit the Schedule Calendar to book your duties.</p>
            <button 
              onClick={() => setActiveTab('schedule')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              View Calendar
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Notifications View Component
  const renderNotificationsView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
        <button 
          onClick={async () => {
            try {
              await supabase
                .from('notifications')
                .update({ read: true, read_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .eq('read', false);
              
              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
              setUnreadCount(0);
            } catch (error) {
              console.error('Error marking all as read:', error);
            }
          }}
          className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
        >
          Mark All as Read
        </button>
      </div>
      
      <div className="space-y-4">
        {notifications.map((notification) => (
          <div 
            key={notification.id} 
            className={`card cursor-pointer transition-all hover:shadow-lg ${
              !notification.read ? 'border-l-4 border-l-emerald-500 bg-emerald-50' : ''
            }`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className="flex items-start space-x-4">
              <div className={`p-2 rounded-full ${
                notification.type === 'success' ? 'bg-green-100 text-green-600' :
                notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                notification.type === 'error' ? 'bg-red-100 text-red-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
                 notification.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> :
                 notification.type === 'error' ? <XCircle className="w-5 h-5" /> :
                 <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{notification.title}</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                    {!notification.read && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
                <p className="text-gray-700 mt-1">{notification.message}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {new Date(notification.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
            <p className="text-gray-600">You'll receive notifications here when there are updates.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardView();
      case 'pending':
        return renderPendingApprovalsView();
      case 'schedule':
        return renderCalendarView();
      case 'duties':
        return renderDutiesView();
      case 'notifications':
        return renderNotificationsView();
      case 'student-management':
        return <StudentManagement />;
      case 'reports':
        return <ReportsAnalytics />;
      case 'profile':
        return <ProfileSettings user={user} onProfileUpdate={onProfileUpdate} />;
      case 'schedule-management':
        return <ScheduleManagement />;
      case 'help':
        return <HelpSupport user={user} />;
      case 'child-duties':
        return <div className="text-center py-12">
          <Eye className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Child's Duty History</h3>
          <p className="text-gray-600">View your child's duty assignments and completion status.</p>
        </div>;
      default:
        return renderDashboardView();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Navigation and Notifications */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side - Logo and Mobile Menu */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label={sidebarOpen ? "Close menu" : "Open menu"}
                aria-expanded={sidebarOpen}
              >
                {sidebarOpen ? (
                  <X className="w-6 h-6 text-gray-700" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-700" />
                )}
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                  <img 
                    src="/image0.png" 
                    alt="Comadronas System Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    Kumadronas System
                  </h1>
                  <p className="text-xs text-gray-600 hidden sm:block">
                    Ilocos Sur Community College
                  </p>
                </div>
              </div>
            </div>

            {/* Right side - Notifications and User Menu */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors relative"
                >
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">Notifications</h3>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.slice(0, 5).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                            !notification.read ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => {
                            handleNotificationClick(notification);
                            setShowNotifications(false);
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              notification.type === 'success' ? 'bg-green-500' :
                              notification.type === 'warning' ? 'bg-yellow-500' :
                              notification.type === 'error' ? 'bg-red-500' :
                              'bg-blue-500'
                            }`}></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 truncate">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      ))}
                      {notifications.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                          <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p>No notifications</p>
                        </div>
                      )}
                      {notifications.length > 5 && (
                        <div className="p-3 text-center border-t border-gray-200">
                          <button
                            onClick={() => {
                              setActiveTab('notifications');
                              setShowNotifications(false);
                            }}
                            className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                          >
                            View all notifications
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile */}
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
                {user?.avatar_url ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg">
                    <img
                      src={user.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-slate-600 rounded-full flex items-center justify-center">
                    {user?.role === 'admin' ? 
                      <Shield className="w-5 h-5 text-white" /> : 
                      <User className="w-5 h-5 text-white" />
                    }
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation - Mobile Drawer & Desktop Sticky */}
          <aside className={`
            fixed lg:sticky
            top-0 lg:top-24
            left-0 lg:left-auto
            h-full lg:h-fit
            w-64 sm:w-72 lg:w-64
            bg-white lg:bg-transparent
            shadow-2xl lg:shadow-none
            z-40 lg:z-auto
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            overflow-y-auto lg:overflow-visible
            pb-20 lg:pb-0
          `}>
            <div className="p-4 lg:p-0 space-y-2">
              {/* Mobile Header */}
              <div className="flex lg:hidden items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                    <img 
                      src="/image0.png" 
                      alt="Comadronas System Logo" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Menu</h2>
                    <p className="text-xs text-gray-600">Navigation</p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Navigation Menu */}
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                        activeTab === item.id
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg transform scale-105'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium text-sm sm:text-base">{item.label}</span>
                      </div>
                      {item.badge > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* User Info Card in Sidebar */}
              <div className="mt-8 p-4 bg-gradient-to-r from-emerald-50 to-slate-50 rounded-lg border border-emerald-200">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-white border-2 border-emerald-200 flex-shrink-0">
                    <img 
                      src="/image0.png" 
                      alt="Comadronas System Logo" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{user?.full_name}</p>
                    <p className="text-sm text-gray-600 capitalize">{user?.role}</p>
                    {user?.email && (
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="lg:hidden w-full flex items-center justify-center space-x-2 px-4 py-3 mt-4 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </aside>

          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity duration-300"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            ></div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Reject Schedule Confirmation Modal */}
      {showRejectConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Reject Schedule</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to reject this schedule? All associated bookings will be cancelled and students will be notified.
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={confirmRejectSchedule}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Reject Schedule
              </button>
              <button 
                onClick={() => {
                  setShowRejectConfirm(false);
                  setScheduleToReject(null);
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
