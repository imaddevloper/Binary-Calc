import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '../../src/components/TabBar';
import type { TabBarProps } from '../../src/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      // The custom bar only reads state/navigation, typed locally in TabBar.tsx.
      tabBar={(props) => <TabBar {...(props as unknown as TabBarProps)} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calculator" />
      <Tabs.Screen name="ipv4" />
      <Tabs.Screen name="learning" />
      <Tabs.Screen name="history" />
    </Tabs>
  );
}
