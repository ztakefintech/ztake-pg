import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { WhyChoose } from "@/components/why-choose"
import { Services } from "@/components/services"
import { BusinessSolutions } from "@/components/business-solutions"
import { SuccessStories } from "@/components/success-stories"
import { CTASection } from "@/components/cta-section"
import { ContactForm } from "@/components/contact-form"
import { Footer } from "@/components/footer"
import { WhatsAppButton } from "@/components/whatsapp-button"
import { ScrollToTop } from "@/components/scroll-to-top"

export default function Home() {
  return (
    <main className="min-h-screen bg-black">
      <Header />
      <Hero />
      <WhyChoose />
      <Services />
      <BusinessSolutions />
      <SuccessStories />
      <CTASection />
      <ContactForm />
      <Footer />
      <WhatsAppButton />
      <ScrollToTop />
    </main>
  )
}
