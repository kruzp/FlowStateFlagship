import { useState } from "react";


export default function Contact() {

  const [formData, setFormData] = useState({
    name:"",
    email:"",
    phone:"",
    message:"",
  });


  const [status, setStatus] = useState("");


  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

  }



  async function handleSubmit(
    e: React.FormEvent
  ) {

    e.preventDefault();


    setStatus("Sending...");


    await new Promise(
      (resolve) => setTimeout(resolve,1000)
    );


    setStatus(
      "Thanks! We'll contact you shortly."
    );


    setFormData({
      name:"",
      email:"",
      phone:"",
      message:"",
    });

  }



  return (

    <section id="contact">

      <div className="container">


        <div className="section-header">

          <h2>
            Ready To Move?
          </h2>


          <p>
            Get your free moving quote today.
          </p>

        </div>



        <div className="contact-container">


          <form
            className="contact-form"
            onSubmit={handleSubmit}
          >


            <input
              type="text"
              name="name"
              placeholder="Your Name"
              value={formData.name}
              onChange={handleChange}
              required
            />


            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
            />


            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              required
            />


            <textarea
              name="message"
              placeholder="Tell us about your move"
              value={formData.message}
              onChange={handleChange}
              required
            />


            <button
              className="button"
              type="submit"
            >
              Get Free Quote
            </button>



            {status && (

              <p className="form-status">
                {status}
              </p>

            )}


          </form>


        </div>


      </div>


    </section>

  );
}