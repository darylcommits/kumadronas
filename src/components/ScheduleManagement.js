import React, { useState, useEffect } from 'react';
import { supabase, dbHelpers } from '../lib/supabase';
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Clock, 
  Check, 
  X, 
  AlertCircle,
  AlertTriangle,
  Filter,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Save,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  User,
  Mail
} from 'lucide-react';

const ScheduleManagement = () => {
  const [schedules, setSchedules] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar'); // calendar, pending, list
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [scheduleToReject, setScheduleToReject] = useState(null);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [initialized, setInitialized] = useState(false);

  const [newSchedule, setNewSchedule] = useState({
    date: '',
    description: 'Community Health Center Duty',
    location: 'ISDH - Magsingal',
    shift_start: '08:00',
    shift_end: '20:00',
    max_students: 4
  });

  // Hospital locations with capacity limits and monthly rotation
  const hospitalLocations = [
    { name: 'ISDH - Magsingal', capacity: 4, description: 'Ilocos Sur District Hospital - Magsingal' },
    { name: 'ISDH - Sinait', capacity: 4, description: 'Ilocos Sur District Hospital - Sinait' },
    { name: 'ISDH - Narvacan', capacity: 4, description: 'Ilocos Sur District Hospital - Narvacan' },
    { name: 'ISPH - Gab. Silang', capacity: 2, description: 'Ilocos Sur Provincial Hospital - Gab. Silang' },
    { name: 'RHU - Sto. Domingo', capacity: 4, description: 'Rural Health Unit - Sto. Domingo' },
    { name: 'RHU - Santa', capacity: 4, description: 'Rural Health Unit - Santa' },
    { name: 'RHU - San Ildefonso', capacity: 4, description: 'Rural Health Unit - San Ildefonso' },
    { name: 'RHU - Bantay', capacity: 4, description: 'Rural Health Unit - Bantay' }
  ];

  // Monthly hospital rotation - each month assigned to one hospital
  const getHospitalForMonth = (date) => {
    const month = date.getMonth(); // 0-11
    const year = date.getFullYear();
    // Rotate through hospitals based on month index
    const hospitalIndex = month % hospitalLocations.length;
    return hospitalLocations[hospitalIndex];
  };

  // Get current month's assigned hospital
  const currentMonthHospital = getHospitalForMonth(currentDate);

  useEffect(() => {
    // Initialize without blocking UI
    Promise.all([
      fetchSchedules(),
      fetchPendingBookings()
    ]).finally(() => {
      setInitialized(true);
    });
  }, []);

  const fetchSchedules = async () => {
    try {
      const data = await dbHelpers.getSchedules();
      setSchedules(data || []);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const fetchPendingBookings = async () => {
    try {
      console.log('Fetching pending bookings for schedule management...');
      const { data, error } = await supabase
        .from('schedule_students')
        .select(`
          *,
          schedules (
            id,
            date,
            description,
            location,
            shift_start,
            shift_end,
            status
          ),
          profiles:student_id (
            id,
            full_name,
            email,
            student_number,
            year_level
          )
        `)
        .eq('status', 'booked')
        .order('booking_time', { ascending: false });

      if (error) {
        console.error('Error fetching pending bookings:', error);
        return;
      }

      console.log('Raw pending bookings data:', data);

      // Filter for valid bookings with schedules that need approval
      const validPendingBookings = (data || []).filter(booking => {
        // Check if booking has valid schedules and profiles data
        if (!booking.schedules || !booking.profiles) {
          console.warn('Booking missing schedules or profiles data:', booking.id);
          return false;
        }
        
        // Only include bookings for schedules that are still pending approval
        return booking.schedules.status === 'pending';
      });
      
      console.log('Filtered valid pending bookings:', validPendingBookings);
      setPendingBookings(validPendingBookings);
    } catch (error) {
      console.error('Error fetching pending bookings:', error);
    }
  };

  const handleApproveSchedule = async (scheduleId) => {
    try {
      console.log('Approving schedule:', scheduleId);
      await dbHelpers.updateScheduleStatus(scheduleId, 'approved', (await supabase.auth.getUser()).data.user?.id);
      await Promise.all([
        fetchSchedules(),
        fetchPendingBookings()
      ]);
      alert('Schedule approved successfully!');
    } catch (error) {
      console.error('Error approving schedule:', error);
      alert('Error approving schedule: ' + error.message);
    }
  };

  const handleRejectSchedule = async (scheduleId) => {
    setScheduleToReject(scheduleId);
    setShowRejectConfirm(true);
  };

  const confirmReject = async () => {
    if (!scheduleToReject) return;

    try {
      console.log('Rejecting schedule:', scheduleToReject);
      
      // Cancel all bookings for this schedule
      const { error: cancelError } = await supabase
        .from('schedule_students')
        .update({ 
          status: 'cancelled', 
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Schedule rejected by admin'
        })
        .eq('schedule_id', scheduleToReject);

      if (cancelError) throw cancelError;

      // Update schedule status
      await dbHelpers.updateScheduleStatus(scheduleToReject, 'cancelled', (await supabase.auth.getUser()).data.user?.id);
      
      await Promise.all([
        fetchSchedules(),
        fetchPendingBookings()
      ]);
      
      setShowRejectConfirm(false);
      setScheduleToReject(null);
      alert('Schedule rejected and all bookings cancelled.');
    } catch (error) {
      console.error('Error rejecting schedule:', error);
      alert('Error rejecting schedule: ' + error.message);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();

    try {
      // Check if the selected location is the assigned hospital for this month
      const selectedDate = new Date(newSchedule.date);
      const assignedHospital = getHospitalForMonth(selectedDate);

      if (newSchedule.location !== assignedHospital.name) {
        alert(`Cannot create schedule for ${newSchedule.location}. ${assignedHospital.name} is assigned to ${selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`);
        return;
      }

      const { data, error } = await supabase
        .from('schedules')
        .insert([{
          ...newSchedule,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      await fetchSchedules();
      setShowAddModal(false);
      setNewSchedule({
        date: '',
        description: 'Community Health Center Duty',
        location: currentMonthHospital.name,
        shift_start: '08:00',
        shift_end: '20:00',
        max_students: currentMonthHospital.capacity
      });
      alert('Schedule created successfully!');
    } catch (error) {
      console.error('Error creating schedule:', error);
      alert('Error creating schedule: ' + error.message);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    setScheduleToDelete(scheduleId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!scheduleToDelete) return;

    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleToDelete);

      if (error) throw error;
      
      await Promise.all([
        fetchSchedules(),
        fetchPendingBookings()
      ]);
      
      setShowDeleteConfirm(false);
      setScheduleToDelete(null);
      alert('Schedule deleted successfully.');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      alert('Error deleting schedule: ' + error.message);
    }
  };

  const generateBulkSchedules = async (startDate, endDate, daysOfWeek = [1, 2, 3, 4, 5]) => {
    try {
      const schedules = [];
      const current = new Date(startDate);
      const end = new Date(endDate);

      while (current <= end) {
        if (daysOfWeek.includes(current.getDay())) {
          // Get the assigned hospital for this date's month
          const assignedHospital = getHospitalForMonth(current);

          schedules.push({
            date: current.toISOString().split('T')[0],
            description: 'Community Health Center Duty',
            location: assignedHospital.name,
            shift_start: '08:00',
            shift_end: '20:00',
            max_students: assignedHospital.capacity,
            created_by: (await supabase.auth.getUser()).data.user?.id
          });
        }
        current.setDate(current.getDate() + 1);
      }

      const { error } = await supabase
        .from('schedules')
        .insert(schedules);

      if (error) throw error;
      await fetchSchedules();
      alert(`Created ${schedules.length} schedules successfully!`);
    } catch (error) {
      console.error('Error creating bulk schedules:', error);
      alert('Error creating bulk schedules: ' + error.message);
    }
  };

  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const calendar = [];
    const currentDateLoop = new Date(startDate);

    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const daySchedule = schedules.find(s => 
          new Date(s.date).toDateString() === currentDateLoop.toDateString()
        );
        
        weekDays.push({
          date: new Date(currentDateLoop),
          schedule: daySchedule,
          isCurrentMonth: currentDateLoop.getMonth() === month,
          isToday: currentDateLoop.toDateString() === new Date().toDateString(),
          isPast: currentDateLoop < new Date().setHours(0,0,0,0)
        });
        
        currentDateLoop.setDate(currentDateLoop.getDate() + 1);
      }
      calendar.push(weekDays);
    }

    return calendar;
  };

  // Pending Approvals View with proper null checking
  const renderPendingApprovalsView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Pending Schedule Approvals</h3>
          <p className="text-gray-600">Review and approve student duty bookings</p>
        </div>
        <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
          {pendingBookings.length} pending approvals
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
          {pendingBookings.map((booking) => {
            // Additional null safety checks
            if (!booking.schedules || !booking.profiles) {
              console.warn('Skipping booking with missing data:', booking.id);
              return null;
            }

            return (
              <div key={booking.id} className="card hover:shadow-lg transition-shadow border-l-4 border-l-yellow-400">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h4 className="font-semibold text-lg text-gray-900">
                          {new Date(booking.schedules.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {booking.schedules.shift_start || '08:00'} - {booking.schedules.shift_end || '17:00'} • {booking.schedules.location || 'Community Health Center'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-3">
                        <User className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-900">{booking.profiles.full_name}</p>
                          <p className="text-sm text-gray-600">{booking.profiles.year_level || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-700">{booking.profiles.email}</p>
                          <p className="text-sm text-gray-600">ID: {booking.profiles.student_number || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-gray-700">Booked on</p>
                          <p className="text-sm text-gray-600">
                            {new Date(booking.booking_time).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Schedule Details:</p>
                      <p className="text-sm font-medium text-gray-900">{booking.schedules.description || 'Community Health Center Duty'}</p>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-6">
                    <button
                      onClick={() => handleApproveSchedule(booking.schedules.id)}
                      className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleRejectSchedule(booking.schedules.id)}
                      className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          }).filter(Boolean)} {/* Filter out null entries */}
        </div>
      )}
    </div>
  );

  // Modal Components
  const AddScheduleModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Add New Schedule</h3>
        <form onSubmit={handleCreateSchedule} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={newSchedule.date}
              onChange={(e) => {
                const selectedDate = e.target.value;
                const assignedHospital = selectedDate ? getHospitalForMonth(new Date(selectedDate)) : null;
                setNewSchedule({
                  ...newSchedule,
                  date: selectedDate,
                  location: assignedHospital ? assignedHospital.name : '',
                  max_students: assignedHospital ? assignedHospital.capacity : 4
                });
              }}
              className="input-field"
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={newSchedule.description}
              onChange={(e) => setNewSchedule({...newSchedule, description: e.target.value})}
              className="input-field"
              placeholder="Community Health Center Duty"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Location</label>
            <select
              value={newSchedule.location}
              onChange={(e) => {
                const selectedLocation = hospitalLocations.find(loc => loc.name === e.target.value);
                setNewSchedule({
                  ...newSchedule,
                  location: e.target.value,
                  max_students: selectedLocation ? selectedLocation.capacity : 2
                });
              }}
              className="input-field"
              required
              disabled={!newSchedule.date}
            >
              <option value="">Select a date first</option>
              {newSchedule.date && (
                <option value={getHospitalForMonth(new Date(newSchedule.date)).name}>
                  {getHospitalForMonth(new Date(newSchedule.date)).name} (Assigned to {new Date(newSchedule.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
                </option>
              )}
            </select>
            {newSchedule.location && (
              <p className="text-xs text-gray-500 mt-1">
                {hospitalLocations.find(loc => loc.name === newSchedule.location)?.description}
              </p>
            )}
            <p className="text-xs text-amber-600 mt-1">
              Each month is assigned to one hospital. The hospital is automatically selected based on the chosen date.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shift Schedule</label>
            <select
              value={`${newSchedule.shift_start}-${newSchedule.shift_end}`}
              onChange={(e) => {
                const [start, end] = e.target.value.split('-');
                setNewSchedule({...newSchedule, shift_start: start, shift_end: end});
              }}
              className="input-field"
              required
            >
              <option value="">Select Shift Schedule</option>
              <option value="08:00-20:00">Day Shift: 6:00 AM - 6:00 PM</option>
              <option value="18:00-06:00">Night Shift: 6:00 PM - 6:00 AM</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
            <input
              type="number"
              value={newSchedule.max_students}
              className="input-field bg-gray-100 cursor-not-allowed"
              readOnly
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">
              Automatically set based on selected hospital location
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button 
              type="submit"
              className="btn-primary flex-1"
            >
              Create Schedule
            </button>
            <button 
              type="button"
              onClick={() => setShowAddModal(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const BulkCreateModal = () => {
    const [bulkData, setBulkData] = useState({
      startDate: '',
      endDate: '',
      daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
      location: 'ISDH - Magsingal'
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <h3 className="text-lg font-semibold mb-4">Bulk Create Schedules</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={bulkData.startDate}
                onChange={(e) => setBulkData({...bulkData, startDate: e.target.value})}
                className="input-field"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={bulkData.endDate}
                onChange={(e) => setBulkData({...bulkData, endDate: e.target.value})}
                className="input-field"
                required
                min={bulkData.startDate}
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Hospitals will be automatically assigned based on monthly rotation:
              </p>
              <ul className="text-xs text-blue-700 mt-2 space-y-1">
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date();
                  date.setMonth(i);
                  const hospital = getHospitalForMonth(date);
                  return (
                    <li key={i}>
                      {date.toLocaleDateString('en-US', { month: 'long' })}: {hospital.name}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Days of Week</label>
              <div className="grid grid-cols-7 gap-2">
                {dayNames.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const newDays = bulkData.daysOfWeek.includes(index)
                        ? bulkData.daysOfWeek.filter(d => d !== index)
                        : [...bulkData.daysOfWeek, index];
                      setBulkData({...bulkData, daysOfWeek: newDays});
                    }}
                    className={`p-2 text-xs rounded ${
                      bulkData.daysOfWeek.includes(index)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => {
                  generateBulkSchedules(bulkData.startDate, bulkData.endDate, bulkData.daysOfWeek);
                  setShowBulkModal(false);
                }}
                className="btn-primary flex-1"
              >
                Create Schedules
              </button>
              <button 
                onClick={() => setShowBulkModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const RejectConfirmModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-red-100 p-2 rounded-full">
            <XCircle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Reject Schedule</h3>
        </div>
        <p className="text-gray-600 mb-6">
          Are you sure you want to reject this schedule? All bookings will be cancelled and students will be notified.
        </p>
        <div className="flex space-x-3">
          <button 
            onClick={confirmReject}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Reject Schedule
          </button>
          <button 
            onClick={() => {
              setShowRejectConfirm(false);
              setScheduleToReject(null);
            }}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  const DeleteConfirmModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-red-100 p-2 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Delete Schedule</h3>
        </div>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete this schedule? This action cannot be undone and will remove all associated bookings.
        </p>
        <div className="flex space-x-3">
          <button 
            onClick={confirmDelete}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Delete Schedule
          </button>
          <button 
            onClick={() => {
              setShowDeleteConfirm(false);
              setScheduleToDelete(null);
            }}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // Show content immediately, don't wait for initialization
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Schedule Management</h2>
          <p className="text-gray-600">Create and manage duty schedules for midwifery students</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setShowBulkModal(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Bulk Create</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Schedule</span>
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="card">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('pending')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              viewMode === 'pending'
                ? 'bg-white text-yellow-600 shadow-md'
                : 'text-gray-600 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Pending Approvals</span>
              {pendingBookings.length > 0 && (
                <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                  {pendingBookings.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
              viewMode === 'calendar'
                ? 'bg-white text-emerald-600 shadow-md'
                : 'text-gray-600 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Calendar View</span>
            </div>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Schedules</p>
              <p className="text-2xl font-bold">{schedules.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Approved</p>
              <p className="text-2xl font-bold">{schedules.filter(s => s.status === 'approved').length}</p>
            </div>
            <Check className="w-8 h-8 text-green-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100">Pending</p>
              <p className="text-2xl font-bold">{schedules.filter(s => s.status === 'pending').length}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-200" />
          </div>
        </div>

        <div className="card bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100">This Month</p>
              <p className="text-2xl font-bold">
                {schedules.filter(s => {
                  const scheduleDate = new Date(s.date);
                  const now = new Date();
                  return scheduleDate.getMonth() === now.getMonth() && 
                         scheduleDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-emerald-200" />
          </div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'pending' ? renderPendingApprovalsView() : (
        /* Calendar View */
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <h3 className="text-xl font-semibold">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-sm text-emerald-600 font-medium mt-1">
                Assigned Hospital: {currentMonthHospital.name}
              </p>
              <p className="text-xs text-gray-500">
                Capacity: {currentMonthHospital.capacity} students
              </p>
            </div>
            
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
                  const studentCount = day.schedule?.schedule_students?.length || 0;
                  const maxStudents = day.schedule?.max_students || 2;

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
                          <div className="flex space-x-1">
                            {day.schedule.status === 'pending' && (
                              <button
                                onClick={() => handleApproveSchedule(day.schedule.id)}
                                className="p-1 text-green-600 hover:text-green-700 rounded"
                                title="Approve Schedule"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteSchedule(day.schedule.id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                              title="Delete Schedule"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {day.schedule ? (
                        <div className="space-y-1">
                          <div className={`text-xs px-2 py-1 rounded ${
                            day.schedule.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {day.schedule.status}
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-600">
                            {studentCount}/{maxStudents} students
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500">
                            {day.schedule.shift_start} - {day.schedule.shift_end}
                          </div>
                        </div>
                      ) : day.isCurrentMonth && !day.isPast && (
                        <button
                          onClick={() => {
                            const assignedHospital = getHospitalForMonth(day.date);
                            setNewSchedule({
                              date: day.date.toISOString().split('T')[0],
                              description: 'Community Health Center Duty',
                              location: assignedHospital.name,
                              shift_start: '08:00',
                              shift_end: '20:00',
                              max_students: assignedHospital.capacity
                            });
                            setShowAddModal(true);
                          }}
                          className="w-full text-left text-[10px] sm:text-xs text-gray-400 hover:text-gray-600 py-1"
                        >
                          + Add schedule
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && <AddScheduleModal />}
      {showBulkModal && <BulkCreateModal />}
      {showDeleteConfirm && <DeleteConfirmModal />}
      {showRejectConfirm && <RejectConfirmModal />}
    </div>
  );
};

export default ScheduleManagement;
