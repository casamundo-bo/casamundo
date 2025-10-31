import { Navigate } from "react-router"

export const ProtectedRouteForAdminOnly = ({children}) => {
    const user = JSON.parse(localStorage.getItem('users'))
    if (user?.role === "admin") {
        return children
    }
    else {
        return <Navigate to={'/admin-dashboard'}/>
    }
}