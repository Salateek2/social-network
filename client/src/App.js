// App: holds the logged-in user and defines all routes (react-router-dom).
import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { watchAuth } from './firebase';
import { api } from './api';

import Navbar from './components/Navbar';
import Front from './components/Front';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Groups from './components/Groups';
import GroupPage from './components/GroupPage';
import People from './components/People';
import TagPage from './components/TagPage';
import UserPage from './components/UserPage';
import Profile from './components/Profile';
import Chat from './components/Chat';
import Notifications from './components/Notifications';
import Stats from './components/Stats';

function App() {
  // undefined = still checking Firebase; null = logged out; object = logged in
  const [firebaseUser, setFirebaseUser] = useState(undefined);
  // The MongoDB profile that matches the Firebase account
  const [me, setMe] = useState(null);

  useEffect(() => {
    // Runs on every login / logout.
    return watchAuth(async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const res = await api('GET', '/api/auth/me');
          setMe(res.user);
        } catch (err) {
          setMe(null);
        }
      } else {
        setMe(null);
      }
    });
  }, []);

  if (firebaseUser === undefined) {
    return <div className="loading">Loading…</div>;
  }

  const loggedIn = !!firebaseUser;

  return (
    <>
      {loggedIn && <Navbar me={me} />}
      <Routes>
        <Route path="/" element={loggedIn ? <Navigate to="/dashboard" /> : <Front />} />
        <Route path="/login" element={loggedIn ? <Navigate to="/dashboard" /> : <Login />} />
        <Route
          path="/register"
          element={loggedIn && me ? <Navigate to="/dashboard" /> : <Register onProfile={setMe} />}
        />
        <Route path="/dashboard" element={loggedIn ? <Dashboard me={me} /> : <Navigate to="/login" />} />
        <Route path="/people" element={loggedIn ? <People me={me} /> : <Navigate to="/login" />} />
        <Route path="/groups" element={loggedIn ? <Groups me={me} /> : <Navigate to="/login" />} />
        <Route path="/groups/:id" element={loggedIn ? <GroupPage me={me} /> : <Navigate to="/login" />} />
        <Route path="/users/:id" element={loggedIn ? <UserPage /> : <Navigate to="/login" />} />
        <Route path="/tags/:tag" element={loggedIn ? <TagPage me={me} /> : <Navigate to="/login" />} />
        <Route path="/profile" element={loggedIn ? <Profile me={me} onChange={setMe} /> : <Navigate to="/login" />} />
        <Route path="/chat" element={loggedIn ? <Chat me={me} /> : <Navigate to="/login" />} />
        <Route path="/notifications" element={loggedIn ? <Notifications /> : <Navigate to="/login" />} />
        <Route path="/stats" element={loggedIn ? <Stats /> : <Navigate to="/login" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App;
