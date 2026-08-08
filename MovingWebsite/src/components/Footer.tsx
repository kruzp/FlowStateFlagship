export default function Footer(){

return (

<footer className="footer">


<div className="container footer-container">


<div className="footer-brand">

<h2>
Lane & Jaxon Moving Co.
</h2>


<p>
Reliable moving services built around trust,
care, and professionalism.
</p>


</div>



<div className="footer-column">

<h3>
Navigation
</h3>


<a href="#hero">
Home
</a>

<a href="#services">
Services
</a>

<a href="#process">
Process
</a>

<a href="#faq">
FAQ
</a>

<a href="#contact">
Contact
</a>


</div>



<div className="footer-column">

<h3>
Contact
</h3>


<p>
(555) 555-5555
</p>


<p>
info@lanejaxonmoving.com
</p>


<p>
Your City, State
</p>


</div>



</div>



<div className="footer-bottom">

<p>
© {new Date().getFullYear()} Lane & Jaxon Moving Co. All rights reserved.
</p>

</div>



</footer>

);

}