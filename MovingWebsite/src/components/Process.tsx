export default function Services() {
  const services = [
    {
      title: "Residential Moving",
      description:
        "From apartments to family homes, we handle your belongings with care.",
    },
    {
      title: "Commercial Moving",
      description:
        "Efficient office and business relocations with minimal downtime.",
    },
    {
      title: "Packing Services",
      description:
        "Professional packing and preparation to keep your items protected.",
    },
    {
      title: "Loading & Unloading",
      description:
        "Heavy lifting handled safely by an experienced moving team.",
    },
  ];

  return (
    <section id="services" className="services-section">
      <div className="container">

        <h2>Our Services</h2>

        <p className="section-description">
          Reliable moving solutions designed to make your move simple,
          organized, and stress-free.
        </p>

        <div className="services-grid">
          {services.map((service) => (
            <div 
              className="service-card" 
              key={service.title}
            >
              <h3>{service.title}</h3>

              <p>
                {service.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}