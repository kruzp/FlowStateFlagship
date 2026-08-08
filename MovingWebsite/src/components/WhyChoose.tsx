export default function WhyChoose() {
  const reasons = [
    {
      number: "01",
      title: "Experienced Team",
      description:
        "Our movers bring experience, professionalism, and attention to detail to every relocation."
    },
    {
      number: "02",
      title: "Reliable Service",
      description:
        "We communicate clearly, arrive prepared, and make sure your move stays organized."
    },
    {
      number: "03",
      title: "Stress-Free Process",
      description:
        "From planning to unloading, we handle the hard parts so you can focus on settling in."
    },
    {
      number: "04",
      title: "Care For Your Belongings",
      description:
        "Every item is treated with respect and handled as if it were our own."
    }
  ];


  return (
    <section className="why">

      <div className="container">

        <div className="why-layout">


          <div className="why-intro">

            <span className="eyebrow">
              Why Choose Us
            </span>


            <h2>
              Moving Made Simple
            </h2>


            <p>
              We combine experience, care, and efficiency to make every move
              smooth from beginning to end.
            </p>

          </div>



          <div className="why-list">

            {reasons.map((reason) => (

              <div 
                className="why-item"
                key={reason.number}
              >

                <span className="why-number">
                  {reason.number}
                </span>


                <div>

                  <h3>
                    {reason.title}
                  </h3>


                  <p>
                    {reason.description}
                  </p>

                </div>

              </div>

            ))}

          </div>


        </div>

      </div>

    </section>
  );
}