import Navbar from "../components/Navbar";

import Hero from "../components/Hero";

import WhyChoose from "../components/WhyChoose";

import Services from "../components/Services";

import Process from "../components/Process";

import Reviews from "../components/Reviews";

import FAQ from "../components/FAQ";

import Contact from "../components/Contact";

import Footer from "../components/Footer";


export default function App(){

return(

<>

<Navbar />


<main>

<Hero />

<WhyChoose />

<Services />

<Process />

<Reviews />

<FAQ />

<Contact />


</main>


<Footer />


</>

);

}