import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:dealerconnect_app/main.dart' as app;

void main() {
  testWidgets('smoke test app loads and shows login', (WidgetTester tester) async {
    await tester.pumpWidget(const app.DealerConnectApp());
    await tester.pumpAndSettle();

    expect(find.text('DealerConnect'), findsOneWidget);
  });
}
