import Layout from "../../components/layout/Layout";
import HeroSection from "../../components/heroSection/HeroSection";
import Category from "../../components/category/Category";
import { getHomepageCategories } from "../../data/categories";
import SeoSection from "../../components/seo/SeoSection";

const HomePage = () => {
    const homepageCategories = getHomepageCategories();
    
    // Use homepageCategories to render your category sections
    return (
        <Layout>
            <HeroSection />
            <Category />
            <SeoSection />
        </Layout>
    );
};

export default HomePage;