// StudentManagement.js - Admin page for managing students
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  GraduationCap,
  CheckCircle,
  XCircle,
  MoreVertical,
  Download,
  Upload,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCoAdminModal, setShowCoAdminModal] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          schedule_students(
            id,
            status,
            schedules(date, status)
          )
        `)
        .eq('role', 'student')
        .order('full_name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.student_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && student.is_active) ||
                         (filterStatus === 'inactive' && !student.is_active);

    return matchesSearch && matchesFilter;
  });

  const toggleStudentStatus = async (studentId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', studentId);

      if (error) throw error;
      await fetchStudents();
    } catch (error) {
      console.error('Error updating student status:', error);
    }
  };

  const exportStudents = (format) => {
    const exportData = filteredStudents.map(student => ({
      'Full Name': student.full_name,
      'Email': student.email,
      'Student Number': student.student_number || 'N/A',
      'Year Level': student.year_level || 'N/A',
      'Phone Number': student.phone_number || 'N/A',
      'Status': student.is_active ? 'Active' : 'Inactive',
      'Total Duties': student.schedule_students?.length || 0,
      'Completed Duties': student.schedule_students?.filter(s => s.status === 'completed').length || 0,
      'Created At': new Date(student.created_at).toLocaleDateString()
    }));

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students-export-${new Date().toISOString().split('T')[0]}.json`;
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
      a.download = `students-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'excel') {
      // Create HTML table for Excel
      const headers = Object.keys(exportData[0] || {});
      const tableHTML = `
        <table>
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
      a.download = `students-export-${new Date().toISOString().split('T')[0]}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student account? This action cannot be undone and will remove all associated data.')) {
      return;
    }

    try {
      // First, cancel all active duties for this student
      const { error: cancelError } = await supabase
        .from('schedule_students')
        .update({ 
          status: 'cancelled', 
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Student account deleted'
        })
        .eq('student_id', studentId)
        .eq('status', 'booked');

      if (cancelError) throw cancelError;

      // Then delete the student profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', studentId)
        .eq('role', 'student');

      if (error) throw error;

      await fetchStudents();
      alert('Student account deleted successfully.');
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Error deleting student: ' + error.message);
    }
  };

  const handleCreateCoAdmin = async (coAdminData) => {
    try {
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: coAdminData.email,
        password: coAdminData.password,
        options: {
          data: {
            full_name: coAdminData.full_name,
            role: 'admin'
          }
        }
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: coAdminData.full_name,
          email: coAdminData.email,
          phone_number: coAdminData.phone_number,
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      alert('Co-admin account created successfully!');
      setShowCoAdminModal(false);
    } catch (error) {
      console.error('Error creating co-admin:', error);
      alert('Error creating co-admin: ' + error.message);
    }
  };

  const AddStudentModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Add New Student</h3>
        <form className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            className="input-field"
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="input-field"
            required
          />
          <input
            type="text"
            placeholder="Student Number"
            className="input-field"
            required
          />
          <select className="input-field" required>
            <option value="">Select Year Level</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>
          <input
            type="tel"
            placeholder="Phone Number *"
            className="input-field"
            required
          />
          <div className="flex space-x-3">
            <button type="submit" className="btn-primary flex-1">
              Add Student
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

  const CoAdminModal = () => {
    const [coAdminData, setCoAdminData] = useState({
      full_name: '',
      email: '',
      phone_number: '',
      password: '',
      confirm_password: ''
    });

    const [showPasswords, setShowPasswords] = useState({
      password: false,
      confirm_password: false
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      if (coAdminData.password !== coAdminData.confirm_password) {
        alert('Passwords do not match');
        return;
      }
      handleCreateCoAdmin(coAdminData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <h3 className="text-lg font-semibold mb-4">Create Co-Admin Account</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              placeholder="Full Name"
              value={coAdminData.full_name}
              onChange={(e) => setCoAdminData({...coAdminData, full_name: e.target.value})}
              className="input-field"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={coAdminData.email}
              onChange={(e) => setCoAdminData({...coAdminData, email: e.target.value})}
              className="input-field"
              required
            />
            <input
              type="tel"
              placeholder="Phone Number *"
              value={coAdminData.phone_number}
              onChange={(e) => setCoAdminData({...coAdminData, phone_number: e.target.value})}
              className="input-field"
              required
            />
            <div className="relative">
              <input
                type={showPasswords.password ? 'text' : 'password'}
                placeholder="Password"
                value={coAdminData.password}
                onChange={(e) => setCoAdminData({...coAdminData, password: e.target.value})}
                className="input-field pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({...showPasswords, password: !showPasswords.password})}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.password ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPasswords.confirm_password ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={coAdminData.confirm_password}
                onChange={(e) => setCoAdminData({...coAdminData, confirm_password: e.target.value})}
                className="input-field pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPasswords({...showPasswords, confirm_password: !showPasswords.confirm_password})}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm_password ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn-primary flex-1">
                Create Co-Admin
              </button>
              <button 
                type="button"
                onClick={() => setShowCoAdminModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const StudentCard = ({ student }) => {
    const totalDuties = student.schedule_students?.length || 0;
    const completedDuties = student.schedule_students?.filter(s => s.status === 'completed').length || 0;

    return (
      <div className="card hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">
                {student.full_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </span>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900">{student.full_name}</h3>
                {student.is_active ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
              
              <div className="mt-1 space-y-1 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>{student.email}</span>
                </div>
                {student.phone_number && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4" />
                    <span>{student.phone_number}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <GraduationCap className="w-4 h-4" />
                  <span>{student.student_number} • {student.year_level}</span>
                </div>
              </div>

              <div className="mt-3 flex space-x-4 text-sm">
                <div className="text-center">
                  <p className="font-medium text-gray-900">{totalDuties}</p>
                  <p className="text-gray-500">Total Duties</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-gray-900">{completedDuties}</p>
                  <p className="text-gray-500">Completed</p>
                </div>
                <div className="text-center">
                  <p className="font-medium text-gray-900">
                    {totalDuties > 0 ? Math.round((completedDuties / totalDuties) * 100) : 0}%
                  </p>
                  <p className="text-gray-500">Success Rate</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSelectedStudent(student);
                setShowEditModal(true);
              }}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteStudent(student.id)}
              className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              title="Delete student account"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleStudentStatus(student.id, student.is_active)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                student.is_active 
                  ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              {student.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
          <p className="text-gray-600">Manage midwifery students and their accounts</p>
        </div>
        <div className="flex space-x-2">
          <button className="btn-secondary flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>
          <div className="relative group">
            <button className="btn-secondary flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <div className="hidden group-hover:block absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <button
                onClick={() => exportStudents('csv')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors first:rounded-t-lg"
              >
                Export as CSV
              </button>
              <button
                onClick={() => exportStudents('excel')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
              >
                Export as Excel
              </button>
              <button
                onClick={() => exportStudents('json')}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors last:rounded-b-lg"
              >
                Export as JSON
              </button>
            </div>
          </div>
          <button 
            onClick={() => setShowCoAdminModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Shield className="w-4 h-4" />
            <span>Create Co-Admin</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search students by name, email, or student number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex space-x-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field w-40"
            >
              <option value="all">All Students</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-r from-slate-600 to-slate-700 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-100">Total Students</p>
              <p className="text-2xl font-bold">{students.length}</p>
            </div>
            <Users className="w-8 h-8 text-slate-200" />
          </div>
        </div>
        <div className="card bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100">Active Students</p>
              <p className="text-2xl font-bold">{students.filter(s => s.is_active).length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-200" />
          </div>
        </div>
        <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">1st Year</p>
              <p className="text-2xl font-bold">{students.filter(s => s.year_level === '1st Year').length}</p>
            </div>
            <GraduationCap className="w-8 h-8 text-green-200" />
          </div>
        </div>
        <div className="card bg-gradient-to-r from-slate-500 to-slate-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-100">4th Year</p>
              <p className="text-2xl font-bold">{students.filter(s => s.year_level === '4th Year').length}</p>
            </div>
            <GraduationCap className="w-8 h-8 text-slate-200" />
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="space-y-4">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => (
            <StudentCard key={student.id} student={student} />
          ))
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first student'}
            </p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
            >
              Add First Student
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && <AddStudentModal />}
      {showCoAdminModal && <CoAdminModal />}
    </div>
  );
};

export default StudentManagement;