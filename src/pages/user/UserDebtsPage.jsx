import Layout from "../../components/layout/Layout";
import UserDebtView from "../../components/user/UserDebtView";

const UserDebtsPage = () => {
    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <UserDebtView />
            </div>
        </Layout>
    );
};

export default UserDebtsPage;