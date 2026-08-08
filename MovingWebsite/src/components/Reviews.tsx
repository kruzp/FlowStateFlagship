export default function Reviews() {
  const reviews = [
    {
      text: "Amazing service. The team made our move completely stress free.",
      name: "Sarah M.",
    },
    {
      text: "Fast, professional, and handled everything with care.",
      name: "James R.",
    },
    {
      text: "Highly recommend for anyone moving locally.",
      name: "Emily T.",
    },
  ];

  return (
    <section id="reviews">

      <div className="container">

        <div className="section-header">

          <h2>
            Customer Reviews
          </h2>

          <p>
            See what our customers say about their moving experience.
          </p>

        </div>


        <div className="reviews-grid">

          {reviews.map((review) => (

            <div
              className="review-card"
              key={review.name}
            >

              <p>
                "{review.text}"
              </p>


              <h3>
                - {review.name}
              </h3>

            </div>

          ))}

        </div>

      </div>

    </section>
  );
}