import { useReveal } from "./hooks/useReveal";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Channels } from "./components/Channels";
import { Languages } from "./components/Languages";
import { CallFlow } from "./components/CallFlow";
import { WhatsApp } from "./components/WhatsApp";
import { Developer } from "./components/Developer";
import { CTABand } from "./components/CTABand";
import { Footer } from "./components/Footer";

export default function App() {
  useReveal();

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      <Navbar />
      <Hero />
      <Channels />
      <Languages />
      <CallFlow />
      <WhatsApp />
      <Developer />
      <CTABand />
      <Footer />
    </div>
  );
}
