import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';

export default function App() {
  const [currentTab, setCurrentTab] = useState('login');

  return (
    <AuthProvider>
      <MainLayout currentTab={currentTab} setCurrentTab={setCurrentTab} />
    </AuthProvider>
  );
}

function MainLayout({ currentTab, setCurrentTab }) {
  const { student, token, login, logout, loading, setStudent } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [courseSearch, setCourseSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [feedbackMsg, setFeedbackMsg] = useState({ text: '', type: '' });
  const [activePortalView, setActivePortalView] = useState('overview'); // 'overview', 'courses', 'idcard', 'profile'

  // Load dashboard info whenever student logs in or changes
  const refreshDashboard = () => {
    if (!token) return;
    fetch('/api/auth/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        setDashboardData(data);
        if (data.student) setStudent(data.student);
      })
      .catch((err) => console.error(err));
  };

  // Load course catalog
  const refreshCourses = () => {
    if (!token) return;
    fetch('/api/auth/courses', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => setCourses(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    if (student) {
      setCurrentTab('portal');
      refreshDashboard();
      refreshCourses();
    }
  }, [student, token]);

  const showToast = (text, type = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg({ text: '', type: '' }), 4000);
  };

  // Course enrollment handler
  const handleEnroll = async (courseId) => {
    try {
      const res = await fetch('/api/auth/courses/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ courseId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enroll');
      showToast(data.message, 'success');
      refreshCourses();
      refreshDashboard();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Course drop handler
  const handleDrop = async (courseId) => {
    if (!window.confirm('Are you sure you want to drop this course?')) return;
    try {
      const res = await fetch(`/api/auth/courses/drop/${courseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to drop course');
      showToast(data.message, 'warning');
      refreshCourses();
      refreshDashboard();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Fast demo login for interviewers
  const handleDemoLogin = async () => {
    try {
      const res = await fetch('/api/auth/demo-login', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo login failed');
      login(data.token, data.student);
      setCurrentTab('portal');
      showToast('Logged in as Demo Student (Alex Mercer)', 'success');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ background: '#f8fafc' }}>
      {/* Top Header */}
      <header className="navbar navbar-expand-lg bg-white border-bottom px-3 px-md-4 py-2 sticky-top">
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-primary text-white p-2 rounded-3 d-flex align-items-center justify-content-center" style={{ width: 38, height: 38 }}>
              <i className="bi bi-mortarboard-fill fs-5"></i>
            </div>
            <div>
              <span className="fw-bold fs-5 text-dark d-block leading-none" style={{ letterSpacing: '-0.5px' }}>Nexus University</span>
              <span className="text-muted small" style={{ fontSize: '0.72rem' }}>Student Academic &amp; Life Portal</span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            {student ? (
              <>
                <div className="d-none d-md-flex align-items-center gap-2 bg-light px-3 py-1 rounded-pill border">
                  <span className="badge bg-success-subtle text-success border border-success-subtle">Active</span>
                  <span className="small fw-semibold text-secondary">{student.rollNumber}</span>
                  <span className="small fw-bold text-dark">{student.fullName}</span>
                </div>
                <button className="btn btn-outline-danger btn-sm px-3" onClick={logout}>
                  <i className="bi bi-box-arrow-right me-1"></i> Log Out
                </button>
              </>
            ) : (
              <div className="d-flex gap-2">
                <button
                  className="btn btn-primary btn-sm px-3 shadow-sm"
                  onClick={handleDemoLogin}
                >
                  <i className="bi bi-lightning-charge-fill me-1"></i> Try Demo Student
                </button>
                <button
                  className={`btn btn-sm ${currentTab === 'login' ? 'btn-dark' : 'btn-outline-secondary'}`}
                  onClick={() => setCurrentTab('login')}
                >
                  Sign In
                </button>
                <button
                  className={`btn btn-sm ${currentTab === 'register' ? 'btn-dark' : 'btn-outline-secondary'}`}
                  onClick={() => setCurrentTab('register')}
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Toast Alert */}
      {feedbackMsg.text && (
        <div className="container mt-3">
          <div className={`alert alert-${feedbackMsg.type} alert-dismissible fade show shadow-sm py-2 px-3 small d-flex align-items-center gap-2`} role="alert">
            <i className={`bi ${feedbackMsg.type === 'danger' ? 'bi-exclamation-octagon-fill' : 'bi-check-circle-fill'}`}></i>
            <span className="fw-semibold">{feedbackMsg.text}</span>
          </div>
        </div>
      )}

      {/* Body Views */}
      <main className="flex-grow-1">
        {!student && currentTab === 'login' && (
          <LoginView setCurrentTab={setCurrentTab} onDemoLogin={handleDemoLogin} />
        )}
        {!student && currentTab === 'register' && (
          <RegisterView setCurrentTab={setCurrentTab} onDemoLogin={handleDemoLogin} />
        )}

        {student && (
          <div className="container py-4">
            {/* Navigation Tabs Pill Bar */}
            <div className="d-flex justify-content-between align-items-center bg-light p-1 rounded-4 border mb-4 flex-wrap gap-2">
              <div className="d-flex gap-1 flex-wrap">
                <button
                  className={`nav-pill-btn ${activePortalView === 'overview' ? 'active' : ''}`}
                  onClick={() => setActivePortalView('overview')}
                >
                  <i className="bi bi-grid-1x2"></i> Overview
                </button>
                <button
                  className={`nav-pill-btn ${activePortalView === 'courses' ? 'active' : ''}`}
                  onClick={() => setActivePortalView('courses')}
                >
                  <i className="bi bi-book"></i> Course Registration
                  <span className="badge bg-primary rounded-pill small ms-1">
                    {dashboardData?.enrolledCourses?.length || 0}
                  </span>
                </button>
                <button
                  className={`nav-pill-btn ${activePortalView === 'idcard' ? 'active' : ''}`}
                  onClick={() => setActivePortalView('idcard')}
                >
                  <i className="bi bi-person-badge"></i> Digital ID Card
                </button>
                <button
                  className={`nav-pill-btn ${activePortalView === 'profile' ? 'active' : ''}`}
                  onClick={() => setActivePortalView('profile')}
                >
                  <i className="bi bi-gear"></i> Settings
                </button>
              </div>

              <div className="text-muted small px-3 d-none d-lg-block">
                Semester: <strong className="text-dark">{student.semester || 'Spring 2026'}</strong>
              </div>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activePortalView === 'overview' && (
              <div>
                {/* Greeting Banner & KPI Tiles */}
                <div className="row g-3 mb-4">
                  <div className="col-12 col-xl-5">
                    <div className="portal-card p-4 h-100 d-flex flex-column justify-content-between">
                      <div className="d-flex align-items-center gap-3 mb-3">
                        <img
                          src={student.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                          alt={student.fullName}
                          className="rounded-circle object-fit-cover border"
                          style={{ width: 62, height: 62 }}
                        />
                        <div>
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle mb-1">
                            {student.department}
                          </span>
                          <h4 className="fw-bold mb-0 text-dark">{student.fullName}</h4>
                          <span className="text-muted small">{student.email}</span>
                        </div>
                      </div>
                      <div className="border-top pt-3 d-flex justify-content-between text-muted small">
                        <span>Roll: <strong className="text-dark">{student.rollNumber}</strong></span>
                        <span>Standing: <strong className="text-success">Honor Roll</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="col-6 col-md-4 col-xl-2">
                    <div className="portal-card p-4 h-100 text-center d-flex flex-column justify-content-center">
                      <span className="text-muted small fw-semibold">Current GPA</span>
                      <div className="display-6 fw-bold text-primary tabular-nums mt-1">
                        {student.gpa?.toFixed(2) || '3.88'}
                      </div>
                      <span className="badge bg-success-subtle text-success small mt-2">Scale: 4.00</span>
                    </div>
                  </div>

                  <div className="col-6 col-md-4 col-xl-2">
                    <div className="portal-card p-4 h-100 text-center d-flex flex-column justify-content-center">
                      <span className="text-muted small fw-semibold">Credits Enrolled</span>
                      <div className="display-6 fw-bold text-dark tabular-nums mt-1">
                        {dashboardData?.totalCredits || 0}
                      </div>
                      <span className="text-muted small mt-2">Max Limit: 18</span>
                    </div>
                  </div>

                  <div className="col-12 col-md-4 col-xl-3">
                    <div className="portal-card p-4 h-100 d-flex flex-column justify-content-center">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-muted small fw-semibold">Avg. Attendance</span>
                        <span className="fw-bold text-success tabular-nums">94%</span>
                      </div>
                      <div className="progress" style={{ height: 8 }}>
                        <div className="progress-bar bg-success" style={{ width: '94%' }}></div>
                      </div>
                      <span className="text-muted small mt-2" style={{ fontSize: '0.74rem' }}>
                        Eligible for mid-term exams (Min. 75% req.)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Enrolled Courses & Announcements Row */}
                <div className="row g-4">
                  {/* Current Courses */}
                  <div className="col-12 col-lg-8">
                    <div className="portal-card p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-bold text-dark mb-0">
                          <i className="bi bi-book-half text-primary me-2"></i>My Enrolled Courses
                        </h5>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setActivePortalView('courses')}
                        >
                          <i className="bi bi-plus-lg me-1"></i> Register More
                        </button>
                      </div>

                      {dashboardData?.enrolledCourses?.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                          <i className="bi bi-journal-x fs-1 opacity-50"></i>
                          <p className="mt-2 mb-0">No courses registered yet this semester.</p>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                              <tr className="small text-muted">
                                <th>Code</th>
                                <th>Course Title &amp; Instructor</th>
                                <th>Schedule</th>
                                <th>Attendance</th>
                                <th>Grade</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dashboardData?.enrolledCourses?.map((c) => (
                                <tr key={c.id}>
                                  <td>
                                    <span className="badge bg-primary text-white fw-bold">{c.course_code}</span>
                                  </td>
                                  <td>
                                    <div className="fw-semibold text-dark">{c.course_name}</div>
                                    <div className="text-muted small">{c.instructor} &bull; {c.credits} Credits</div>
                                  </td>
                                  <td className="small text-secondary">{c.schedule}</td>
                                  <td>
                                    <div className="d-flex align-items-center gap-2">
                                      <div className="progress flex-grow-1" style={{ width: 60, height: 6 }}>
                                        <div className="progress-bar bg-primary" style={{ width: `${c.attendance_percent}%` }}></div>
                                      </div>
                                      <span className="small tabular-nums text-muted">{c.attendance_percent}%</span>
                                    </div>
                                  </td>
                                  <td>
                                    <span className="badge bg-success-subtle text-success border border-success-subtle fw-bold">
                                      {c.grade}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      className="btn btn-sm btn-outline-danger p-1 px-2"
                                      onClick={() => handleDrop(c.id)}
                                      title="Drop course"
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Campus Notices */}
                  <div className="col-12 col-lg-4">
                    <div className="portal-card p-4">
                      <h5 className="fw-bold text-dark mb-3">
                        <i className="bi bi-bell-fill text-warning me-2"></i>Campus Notices
                      </h5>
                      <div className="d-flex flex-column gap-3">
                        {dashboardData?.announcements?.map((item) => {
                          const catClass = `badge-category-${item.category.toLowerCase()}`;
                          return (
                            <div key={item.id} className="p-3 rounded-3 bg-light border border-light-subtle">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className={`badge ${catClass} px-2 py-1`}>{item.category}</span>
                                <span className="text-muted small" style={{ fontSize: '0.72rem' }}>{item.posted_date}</span>
                              </div>
                              <h6 className="fw-semibold text-dark mb-1 small">{item.title}</h6>
                              <p className="text-muted small mb-0">{item.content}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: COURSE REGISTRATION FACILITY */}
            {activePortalView === 'courses' && (
              <div className="portal-card p-4">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                  <div>
                    <h4 className="fw-bold text-dark mb-1">Course Catalog &amp; Registration</h4>
                    <p className="text-muted small mb-0">Browse university courses, check remaining capacity, and enroll instantly.</p>
                  </div>
                  <div className="d-flex gap-2">
                    <div className="input-group" style={{ maxWidth: 260 }}>
                      <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search code or title..."
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                      />
                    </div>
                    <select
                      className="form-select"
                      style={{ maxWidth: 180 }}
                      value={selectedDeptFilter}
                      onChange={(e) => setSelectedDeptFilter(e.target.value)}
                    >
                      <option value="ALL">All Departments</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Data Science">Data Science</option>
                      <option value="Information Tech">Information Tech</option>
                    </select>
                  </div>
                </div>

                <div className="row g-3">
                  {courses
                    .filter((c) => {
                      const matchQuery = c.course_code.toLowerCase().includes(courseSearch.toLowerCase()) ||
                                         c.course_name.toLowerCase().includes(courseSearch.toLowerCase());
                      const matchDept = selectedDeptFilter === 'ALL' || c.department === selectedDeptFilter;
                      return matchQuery && matchDept;
                    })
                    .map((c) => (
                      <div key={c.id} className="col-12 col-md-6 col-lg-4">
                        <div className={`portal-card p-4 h-100 d-flex flex-column justify-content-between ${c.is_enrolled ? 'border-primary' : ''}`}>
                          <div>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="badge bg-primary text-white fw-bold">{c.course_code}</span>
                              <span className="badge bg-light text-dark border">{c.credits} Credits</span>
                            </div>
                            <h6 className="fw-bold text-dark mb-1">{c.course_name}</h6>
                            <div className="text-muted small mb-2"><i className="bi bi-person me-1"></i>{c.instructor}</div>
                            <div className="small text-secondary mb-3"><i className="bi bi-clock me-1"></i>{c.schedule}</div>
                          </div>

                          <div className="border-top pt-3">
                            <div className="d-flex justify-content-between align-items-center mb-2 small text-muted">
                              <span>Capacity</span>
                              <span className="tabular-nums fw-semibold">{c.enrolled_count} / {c.capacity} Enrolled</span>
                            </div>

                            {c.is_enrolled ? (
                              <button
                                className="btn btn-outline-danger btn-sm w-100"
                                onClick={() => handleDrop(c.id)}
                              >
                                <i className="bi bi-check-circle-fill me-1 text-success"></i> Enrolled (Click to Drop)
                              </button>
                            ) : (
                              <button
                                className="btn btn-primary btn-sm w-100"
                                onClick={() => handleEnroll(c.id)}
                                disabled={c.enrolled_count >= c.capacity}
                              >
                                {c.enrolled_count >= c.capacity ? 'Class Full' : '+ Enroll in Course'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB 3: DIGITAL STUDENT ID CARD */}
            {activePortalView === 'idcard' && (
              <div className="portal-card p-5 text-center">
                <h4 className="fw-bold text-dark mb-2">Official Digital Student Pass</h4>
                <p className="text-muted small mb-4">Valid student credential for campus facilities, cloud access, and libraries.</p>

                <div className="digital-id-card text-start">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-mortarboard-fill fs-4 text-warning"></i>
                      <span className="fw-bold small text-uppercase tracking-wider">Nexus University</span>
                    </div>
                    <div className="id-chip"></div>
                  </div>

                  <div className="d-flex align-items-center gap-3 mb-4">
                    <img
                      src={student.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                      alt={student.fullName}
                      className="rounded-3 border border-2 border-white object-fit-cover"
                      style={{ width: 80, height: 80 }}
                    />
                    <div>
                      <h5 className="fw-bold mb-0 text-white">{student.fullName}</h5>
                      <div className="text-info small fw-semibold">{student.department}</div>
                      <div className="text-white-50 small mt-1">Roll No: {student.rollNumber}</div>
                    </div>
                  </div>

                  <div className="row g-2 mb-3 text-white-50 small">
                    <div className="col-6">
                      <span>VALID THRU:</span>
                      <div className="text-white fw-bold">JUNE 2028</div>
                    </div>
                    <div className="col-6">
                      <span>STATUS:</span>
                      <div className="text-success fw-bold">ACTIVE STUDENT</div>
                    </div>
                  </div>

                  <div className="id-barcode mt-3"></div>
                </div>

                <div className="mt-4">
                  <button className="btn btn-outline-dark px-4" onClick={() => window.print()}>
                    <i className="bi bi-printer me-2"></i> Print / Save ID Card
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: PROFILE & SETTINGS */}
            {activePortalView === 'profile' && (
              <div className="portal-card p-4" style={{ maxWidth: 650, margin: '0 auto' }}>
                <h4 className="fw-bold text-dark mb-3">Account &amp; Security Settings</h4>
                <div className="mb-4">
                  <label className="form-label small fw-semibold text-muted">Department</label>
                  <input type="text" className="form-control" value={student.department} disabled />
                </div>
                <div className="mb-4">
                  <label className="form-label small fw-semibold text-muted">Registered Email</label>
                  <input type="email" className="form-control" value={student.email} disabled />
                </div>
                <div className="p-3 rounded-3 bg-light border small text-muted">
                  <div className="fw-bold text-dark mb-1"><i className="bi bi-shield-lock-fill text-success me-1"></i> Cryptographic Security Summary</div>
                  <div>&bull; Passwords hashed via <code>bcryptjs</code> with 10 salt rounds before storage.</div>
                  <div>&bull; Sessions governed by signed stateless JSON Web Tokens (JWT).</div>
                  <div>&bull; Database integrity maintained via SQLite relational constraints.</div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="text-center py-3 text-muted small border-top bg-white mt-auto">
        Nexus CampusPortal &bull; Built with Node.js, Express, SQLite3, and React 18
      </footer>
    </div>
  );
}

// ----------------- LOGIN VIEW -----------------
function LoginView({ setCurrentTab, onDemoLogin }) {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid credentials');
      login(data.token, data.student);
      setCurrentTab('portal');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-5 col-lg-4">
          <div className="portal-card p-4 p-md-5">
            <div className="text-center mb-4">
              <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-circle d-inline-block mb-2">
                <i className="bi bi-shield-lock-fill fs-3"></i>
              </div>
              <h3 className="fw-bold text-dark mb-1">Student Portal</h3>
              <p className="text-muted small">Sign in with your campus credentials</p>
            </div>

            {/* Quick Demo One-Click Login Button */}
            <div className="mb-4">
              <button
                type="button"
                className="btn btn-primary w-100 py-2 shadow-sm d-flex align-items-center justify-content-center gap-2"
                onClick={onDemoLogin}
              >
                <i className="bi bi-lightning-charge-fill"></i>
                <span>One-Click Demo Student</span>
              </button>
              <div className="text-center text-muted small mt-1" style={{ fontSize: '0.72rem' }}>
                Instant access for interviewers &bull; No form filling needed!
              </div>
            </div>

            <div className="d-flex align-items-center my-3 text-muted">
              <hr className="flex-grow-1" />
              <span className="px-2 small">or use password</span>
              <hr className="flex-grow-1" />
            </div>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Student Email</label>
                <input
                  type="email"
                  required
                  className="form-control"
                  placeholder="alex.mercer@campus.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold text-muted">Password</label>
                <input
                  type="password"
                  required
                  className="form-control"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-dark w-100 py-2 fw-semibold" disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            <div className="text-center mt-3">
              <small className="text-muted">
                Need an account?{' '}
                <a href="#!" onClick={() => setCurrentTab('register')} className="fw-semibold text-decoration-none">
                  Register here
                </a>
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------- REGISTER VIEW -----------------
function RegisterView({ setCurrentTab, onDemoLogin }) {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    rollNumber: '',
    department: 'Computer Science',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      login(data.token, data.student);
      setCurrentTab('portal');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6 col-lg-5">
          <div className="portal-card p-4 p-md-5">
            <div className="text-center mb-4">
              <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-circle d-inline-block mb-2">
                <i className="bi bi-person-plus-fill fs-3"></i>
              </div>
              <h3 className="fw-bold text-dark mb-1">Create Student Account</h3>
              <p className="text-muted small">Register to enroll in courses &amp; view grades</p>
            </div>

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">Full Name</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. Jordan Smith"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold text-muted">University Email</label>
                <input
                  type="email"
                  required
                  className="form-control"
                  placeholder="jordan@campus.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="form-label small fw-semibold text-muted">Roll Number</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="CS2026-088"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-semibold text-muted">Department</label>
                  <select
                    className="form-select"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option>Computer Science</option>
                    <option>Data Science</option>
                    <option>Information Tech</option>
                    <option>Electrical Eng</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold text-muted">Password (min 6 characters)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="form-control"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold" disabled={loading}>
                {loading ? 'Creating Account...' : 'Complete Registration'}
              </button>
            </form>

            <div className="text-center mt-3">
              <small className="text-muted">
                Already registered?{' '}
                <a href="#!" onClick={() => setCurrentTab('login')} className="fw-semibold text-decoration-none">
                  Log in
                </a>
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
