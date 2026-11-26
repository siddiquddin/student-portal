import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [student, setStudent] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('student_jwt') || null);
  const [loading, setLoading] = useState(true);

  // Check token and fetch user on load
  useEffect(() => {
    if (token) {
      fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error('Token expired or invalid');
          return res.json();
        })
        .then((data) => {
          setStudent(data.student);
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (jwtToken, studentData) => {
    localStorage.setItem('student_jwt', jwtToken);
    setToken(jwtToken);
    setStudent(studentData);
  };

  const logout = () => {
    localStorage.removeItem('student_jwt');
    setToken(null);
    setStudent(null);
  };

  return (
    <AuthContext.Provider value={{ student, token, login, logout, loading, setStudent }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
