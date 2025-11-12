// src/components/ProtectedRoute.tsx



import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { RootState } from "@/redux/store";

interface Props {
  children: JSX.Element;
}

const ProtectedRoute = ({ children }: Props) => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return children;
};

export default ProtectedRoute;