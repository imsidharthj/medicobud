import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

const steps = [
	{
		title: "Open Medicobud when you start feeling unwell",
		image: "/user-sick.png",
	},
	{
		title: "Select your risk factors and symptoms",
		image: "/homepage-mobile-form-2.png",
	},
	{
		title: "Get response for possible conditions",
		image: "/homepage-mobile-response-2.png",
	},
];

export default function HowItWorksScroll() {
	const ref = useRef(null);

	const { scrollYProgress } = useScroll({
		target: ref,
		offset: ["start start", "end end"],
	});

    // const sectionHeight = `${(steps.length - 0.5) * 100}vh`; // 2.5x viewport for 3 steps

	const y = useTransform(
		scrollYProgress,
		[0, 1],
		// Adjust animation range to leave space for final step
		["0vh", `-${(steps.length - 1) * 100 - 15}vh`]
	);

	return (
		<section
			ref={ref}
            className="bg-[#f0f0f0]"
            // style={{ height: sectionHeight }}
			>
			{/* Sticky container that creates the viewport */}
			<div className="sticky top-0 h-screen overflow-hidden">
				<div className="max-w-7xl mx-auto flex h-full px-4 md:px-8">
					{/* Left Panel - matches the visual line height */}
					<div className="w-1/3 flex items-center justify-center border-r-2 border-gray-900 pr-6">
						<h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-[#2D3648]">
							How it works
						</h2>
					</div>

					{/* Right Panel */}
					<div className="w-2/3 relative h-full overflow-hidden">
						<motion.div
							style={{ y }}
							className="absolute top-0 left-0 w-full"
						>
							{steps.map((step, index) => (
								<div
									key={index}
									className="h-screen flex flex-col justify-center items-center p-4 sm:p-8"
								>
									<Card className="bg-[#F5EFE0] rounded-xl shadow-lg w-full max-w-sm sm:max-w-md md:max-w-lg">
										<CardHeader className="p-4 sm:p-6">
											<CardTitle className="text-lg sm:text-xl md:text-2xl text-[#2D3648] text-center">
												{step.title}
											</CardTitle>
										</CardHeader>
										<CardContent className="p-4 sm:p-6">
											<div className="relative aspect-[9/16] sm:aspect-video md:aspect-[3/4] max-h-[60vh] mx-auto rounded-lg overflow-hidden">
												<img
													src={step.image}
													alt={step.title}
													className="w-full h-full object-contain"
												/>
											</div>
										</CardContent>
									</Card>
								</div>
							))}
						</motion.div>
					</div>
				</div>
			</div>
		</section>
	);
}
