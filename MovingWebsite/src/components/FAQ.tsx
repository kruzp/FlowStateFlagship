export default function FAQ() {

  const questions = [
    {
      question: "How far in advance should I book?",
      answer:
        "We recommend booking as early as possible to secure your preferred moving date.",
    },
    {
      question: "Do you provide packing services?",
      answer:
        "Yes, our team can safely pack and prepare your belongings before moving day.",
    },
    {
      question: "Do you handle large items?",
      answer:
        "Yes, our experienced movers can safely handle furniture, appliances, and other heavy items.",
    },
  ];


  return (

    <section id="faq">

      <div className="container">


        <div className="section-header">

          <h2>
            Frequently Asked Questions
          </h2>

          <p>
            Answers to common questions about our moving services.
          </p>

        </div>


        <div className="faq-grid">


          {questions.map((item) => (

            <div
              className="faq-item"
              key={item.question}
            >

              <h3>
                {item.question}
              </h3>


              <p>
                {item.answer}
              </p>


            </div>

          ))}


        </div>


      </div>

    </section>

  );
}