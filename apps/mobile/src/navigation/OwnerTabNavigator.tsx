import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { OwnerAnalyticsScreen } from '../screens/owner/OwnerAnalyticsScreen';
import { OwnerVehiclesScreen } from '../screens/owner/OwnerVehiclesScreen';
import { OwnerDriversScreen } from '../screens/owner/OwnerDriversScreen';
import { OwnerTripsExpensesScreen } from '../screens/owner/OwnerTripsExpensesScreen';
import { OwnerAttendanceSalaryScreen } from '../screens/owner/OwnerAttendanceSalaryScreen';
import { theme } from '../constants/theme';
import {
  BarChart3,
  Car,
  Users,
  Navigation,
  CalendarCheck,
} from 'lucide-react-native';

const Tab = createBottomTabNavigator();

const TabBarIconWrapper = ({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) => {
  return (
    <View style={[styles.iconPill, focused && styles.iconPillActive]}>
      {children}
    </View>
  );
};

export const OwnerTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.borderLight,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
          ...theme.shadows.level1,
        },
        tabBarActiveTintColor: theme.colors.primaryContainer,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Analytics"
        component={OwnerAnalyticsScreen}
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconWrapper focused={focused}>
              <BarChart3
                size={20}
                color={focused ? theme.colors.primaryContainer : color}
              />
            </TabBarIconWrapper>
          ),
        }}
      />

      <Tab.Screen
        name="Vehicles"
        component={OwnerVehiclesScreen}
        options={{
          tabBarLabel: 'Fleet',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconWrapper focused={focused}>
              <Car
                size={20}
                color={focused ? theme.colors.primaryContainer : color}
              />
            </TabBarIconWrapper>
          ),
        }}
      />

      <Tab.Screen
        name="Drivers"
        component={OwnerDriversScreen}
        options={{
          tabBarLabel: 'Drivers',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconWrapper focused={focused}>
              <Users
                size={20}
                color={focused ? theme.colors.primaryContainer : color}
              />
            </TabBarIconWrapper>
          ),
        }}
      />

      <Tab.Screen
        name="TripsExpenses"
        component={OwnerTripsExpensesScreen}
        options={{
          tabBarLabel: 'Trips & Fuel',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconWrapper focused={focused}>
              <Navigation
                size={20}
                color={focused ? theme.colors.primaryContainer : color}
              />
            </TabBarIconWrapper>
          ),
        }}
      />

      <Tab.Screen
        name="StaffPayroll"
        component={OwnerAttendanceSalaryScreen}
        options={{
          tabBarLabel: 'Payroll',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconWrapper focused={focused}>
              <CalendarCheck
                size={20}
                color={focused ? theme.colors.primaryContainer : color}
              />
            </TabBarIconWrapper>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconPill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: theme.colors.primaryLight,
  },
});
