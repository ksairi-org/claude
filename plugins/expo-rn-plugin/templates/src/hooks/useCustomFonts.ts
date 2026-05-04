import { useFonts } from "expo-font";

const useCustomFonts = () => {
  const [fontsLoaded, error] = useFonts({
    "Inter-SemiBold": require("../../assets/fonts/Inter-SemiBold.ttf"),
    "Inter-Bold": require("../../assets/fonts/Inter-Bold.ttf"),
    "Inter-Regular": require("../../assets/fonts/Inter-Regular.ttf"),
  });

  if (error) {
    console.error("useCustomFonts ERROR:", error);
  }

  return fontsLoaded;
};

export { useCustomFonts };
