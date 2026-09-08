import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import RepositoriesPage from './pages/RepositoriesPage';
import DocumentsPage from './pages/DocumentsPage';
import RepositoryDetailPage from './pages/RepositoryDetailPage';
import FileDetailPage from './pages/FileDetailPage';
import SearchPage from './pages/SearchPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/repos" element={<RepositoriesPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/repos/:repoId" element={<RepositoryDetailPage />} />
            <Route path="/repos/:repoId/files/:docId" element={<FileDetailPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}