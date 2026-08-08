export default function Services() {

const services = [
{
number:"01",
title:"Residential Moving",
description:
"Complete home relocations handled with care, precision, and attention to every detail.",
details:"Apartments • Homes • Local Moves"
},
{
number:"02",
title:"Commercial Moving",
description:
"Professional business relocations designed to minimize downtime and keep your operation moving.",
details:"Offices • Businesses • Scheduling"
},
{
number:"03",
title:"Packing Services",
description:
"Organized packing solutions that protect your belongings before they ever leave your door.",
details:"Preparation • Organization • Protection"
},
{
number:"04",
title:"Loading & Unloading",
description:
"Experienced movers handling the heavy lifting safely and efficiently.",
details:"Furniture • Equipment • Delivery"
}
];


return (

<section id="services" className="services">

<div className="container">


<div className="section-header">

<span className="eyebrow">
What We Offer
</span>


<h2>
Moving Solutions For Every Situation
</h2>


<p>
From small apartments to full business relocations,
we provide flexible services built around your move.
</p>

</div>



<div className="services-showcase">


{services.map((service)=>(

<article
className="service-row"
key={service.number}
>


<div className="service-number">
{service.number}
</div>



<div className="service-main">

<h3>
{service.title}
</h3>


<p>
{service.description}
</p>


<span>
{service.details}
</span>


</div>



<div className="service-arrow">
↗
</div>


</article>


))}


</div>


</div>

</section>

);

}