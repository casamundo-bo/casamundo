/* eslint-disable react/no-unescaped-entities */

const Testimonial = () => {
    return (
        <div>
            <section className="text-gray-600 body-font mb-10">
                {/* main  */}
                <div className="container px-5 py-10 mx-auto">
                    {/* Heading  */}
                    <h1 className=' text-center text-3xl font-bold text-black' >Nosotros</h1>
                    {/* para  */}
                    <h2 className=' text-center text-2xl font-semibold mb-10' >Quienes somos <span className=' text-pink-500'>nosotros</span>?</h2>

                    <div className="flex flex-wrap -m-4">

                        {/* TESTIMONIALS
                         //Testimonial 1
                        <div className="lg:w-1/3 lg:mb-0 mb-6 p-4">
                            <div className="h-full text-center">
                                <img alt="testimonial" className="w-20 h-20 mb-8 object-cover object-center rounded-full inline-block border-2 border-gray-200 bg-gray-100" src="https://ecommerce-sk.vercel.app/img/kamal.png" />
                                <p className="leading-relaxed">Edison bulb retro cloud bread echo park, helvetica stumptown taiyaki taxidermy 90's cronut +1 kinfolk. Single-origin coffee ennui shaman taiyaki vape DIY tote bag drinking vinegar cronut adaptogen squid fanny pack vaporware.</p>
                                <span className="inline-block h-1 w-10 rounded bg-pink-500 mt-6 mb-4" />
                                <h2 className="text-gray-900 font-medium title-font tracking-wider text-sm uppercase">Kamal Nayan Upadhyay</h2>
                                <p className="text-gray-500">Senior Product Designer</p>
                            </div>
                        </div>

                         //Testimonial 2 
                        <div className="lg:w-1/3 lg:mb-0 mb-6 p-4">
                            <div className="h-full text-center">
                                <img alt="testimonial" className="w-20 h-20 mb-8 object-cover object-center rounded-full inline-block border-2 border-gray-200 bg-gray-100" src="https://www.devknus.com/img/gawri.png" />
                                <p className="leading-relaxed">Edison bulb retro cloud bread echo park, helvetica stumptown taiyaki taxidermy 90's cronut +1 kinfolk. Single-origin coffee ennui shaman taiyaki vape DIY tote bag drinking vinegar cronut adaptogen squid fanny pack vaporware.</p>
                                <span className="inline-block h-1 w-10 rounded bg-pink-500 mt-6 mb-4" />
                                <h2 className="text-gray-900 font-medium title-font tracking-wider text-sm uppercase">S Mishra</h2>
                                <p className="text-gray-500">UI Develeoper</p>
                            </div>
                        </div>

                        //estimonial 3 
                        <div className="lg:w-1/3 lg:mb-0 p-4">
                            <div className="h-full text-center">
                                <img alt="testimonial" className="w-20 h-20 mb-8 object-cover object-center rounded-full inline-block border-2 border-gray-200 bg-gray-100" src="https://firebasestorage.googleapis.com/v0/b/devknus-official-database.appspot.com/o/images%2FScreenshot%202023-07-07%20at%202.20.32%20PM-modified.png?alt=media&token=324ddd80-2b40-422c-9f1c-1c1fa34943fa" />
                                <p className="leading-relaxed">Edison bulb retro cloud bread echo park, helvetica stumptown taiyaki taxidermy 90's cronut +1 kinfolk. Single-origin coffee ennui shaman taiyaki vape DIY tote bag drinking vinegar cronut adaptogen squid fanny pack vaporware.</p>
                                <span className="inline-block h-1 w-10 rounded bg-pink-500 mt-6 mb-4" />
                                <h2 className="text-gray-900 font-medium title-font tracking-wider text-sm uppercase">XYZ </h2>
                                <p className="text-gray-500">CTO</p>
                            </div>
                        </div>
                        */}
                        <div className="container mx-auto px-4 py-8">
    {/* Campo de descripción */}
    <div className="w-full lg:w-1/2 mx-auto mb-6 p-4">
        <div className="h-full text-center bg-white shadow-lg rounded-lg p-6">
            <p className="leading-relaxed text-gray-700">
                Edison bulb retro cloud bread echo park, helvetica stumptown taiyaki taxidermy 90's cronut +1 kinfolk. Single-origin coffee ennui shaman taiyaki vape DIY tote bag drinking vinegar cronut adaptogen squid fanny pack vaporware.
            </p>
        </div>
    </div>

    {/* Campo de ubicación (más grande) */}
    <div className="w-full lg:w-3/4 mx-auto p-4">
        <div className="h-64 bg-gray-200 rounded-lg overflow-hidden shadow-lg">
            {/* Aquí puedes poner un mapa o una imagen representando la ubicación */}
            <iframe
                title="Ubicación"
                className="w-full h-full"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d239.065389521768!2d-68.21977347135544!3d-16.52376345578987!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x915ede8a11f2a4fb%3A0xfa5bb1d9a097300c!2sFQGJ%2BG58%2C%20El%20Alto!5e0!3m2!1ses!2sbo!4v1741659525072!5m2!1ses!2sbo"
                allowFullScreen
            />
        </div>
    </div>
</div>

                    </div>
                </div>
            </section>
        </div>
    )
}

export default Testimonial