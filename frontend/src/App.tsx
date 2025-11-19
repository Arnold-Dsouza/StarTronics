import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Protected, AdminOnly } from './context/AuthContext';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import RepairsList from './pages/repairs/RepairsList';
import NewRepairRequest from './pages/repairs/NewRepairRequest';
import EditRepairRequest from './pages/repairs/EditRepairRequest';
import Quotes from './pages/Quotes';
import Checkout from './pages/Checkout';
import PaymentSuccess from './pages/PaymentSuccess';
import Payments from './pages/Payments';
import SavedCards from './pages/SavedCards';
import Admin from './pages/Admin';
import TechnicianDashboard from './pages/TechnicianDashboard';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AddStory from './pages/AddStory';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/repairs" element={<Protected><RepairsList /></Protected>} />
        <Route path="/repairs/new" element={<Protected><NewRepairRequest /></Protected>} />
        <Route path="/repairs/edit/:id" element={<Protected><EditRepairRequest /></Protected>} />
        <Route path="/quotes" element={<Protected><Quotes /></Protected>} />
        <Route path="/checkout" element={<Protected><Checkout /></Protected>} />
        <Route path="/payment-success" element={<Protected><PaymentSuccess /></Protected>} />
        <Route path="/stories/new" element={<Protected><AddStory /></Protected>} />
        <Route path="/payments" element={<Protected><Payments /></Protected>} />
        <Route path="/cards" element={<Protected><SavedCards /></Protected>} />
        <Route path="/technician" element={<Protected><TechnicianDashboard /></Protected>} />
        <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
      </Routes>
    </Layout>
  );
}

export default App;
