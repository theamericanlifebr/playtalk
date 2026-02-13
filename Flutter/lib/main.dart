import 'package:flutter/material.dart';

import 'login_screen.dart';

void main() {
  runApp(const AmericanLifeLoginApp());
}

class AmericanLifeLoginApp extends StatelessWidget {
  const AmericanLifeLoginApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'American Life Login',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF003366)),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}
